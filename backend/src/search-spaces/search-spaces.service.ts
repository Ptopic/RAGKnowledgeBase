import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { MemberRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import { UploadService } from "../upload";
import {
	CreateSearchSpaceDto,
	SearchSpaceDto,
	UpdateSearchSpaceDto,
} from "./dtos/search-space.dto";
import { InviteMemberDto, InviteResponseDto, MemberDto, UpdateMemberRoleDto } from "./dtos/member.dto";

@Injectable()
export class SearchSpacesService {
	private readonly logger = new Logger(SearchSpacesService.name);

	constructor(
		private prisma: PrismaService,
		private permissionsService: PermissionsService,
		private uploadService: UploadService,
	) {}

	async create(
		createDto: CreateSearchSpaceDto,
		userId: string,
	): Promise<SearchSpaceDto> {
		try {
			if (
				createDto.headline_image_url &&
				!this.uploadService.isOwnedUrl(createDto.headline_image_url)
			) {
				throw new BadRequestException(
					"headline_image_url must point to application-managed storage",
				);
			}

			const searchSpace = await this.prisma.searchSpace.create({
				data: {
					name: createDto.name,
					description: createDto.description,
					headlineImageUrl: createDto.headline_image_url,
					userId,
				},
			});

			await this.prisma.searchSpaceMember.create({
				data: {
					searchSpaceId: searchSpace.id,
					userId,
					role: MemberRole.OWNER,
					invitedById: userId,
				},
			});

			return this.toDto(searchSpace, MemberRole.OWNER);
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create search space: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 200,
		q?: string,
	): Promise<SearchSpaceDto[]> {
		try {
			const accessibleSpaces = await this.permissionsService.getSearchSpacesForUser(userId);
			const spaceIds = accessibleSpaces.map((s) => s.id);

			const trimmedQ = q?.trim();
			const where: Prisma.SearchSpaceWhereInput = { id: { in: spaceIds } };
			if (trimmedQ) {
				where.name = { contains: trimmedQ, mode: "insensitive" };
			}

			const searchSpaces = await this.prisma.searchSpace.findMany({
				where,
				skip,
				take: limit,
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			const roleMap = new Map(accessibleSpaces.map((s) => [s.id, s]));

			return searchSpaces.map((ss) => {
				const spaceInfo = roleMap.get(ss.id);
				return this.toDto(ss, spaceInfo?.role ?? MemberRole.VIEWER);
			});
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch search spaces: ${error.message}`,
			);
		}
	}

	async findOne(
		id: number,
		membership: SearchSpaceMembershipAttachment,
	): Promise<SearchSpaceDto> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id },
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			if (!searchSpace) {
				throw new NotFoundException("Search space not found");
			}

			return this.toDto(searchSpace, membership.role);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch search space: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateSearchSpaceDto,
		membership: SearchSpaceMembershipAttachment,
	): Promise<SearchSpaceDto> {
		try {
			if (
				updateDto.headline_image_url &&
				!this.uploadService.isOwnedUrl(updateDto.headline_image_url)
			) {
				throw new BadRequestException(
					"headline_image_url must point to application-managed storage",
				);
			}

			const existing = await this.prisma.searchSpace.findFirst({
				where: { id },
			});

			if (!existing) {
				throw new NotFoundException("Search space not found");
			}

			if (
				updateDto.headline_image_url !== undefined &&
				existing.headlineImageUrl &&
				existing.headlineImageUrl !== updateDto.headline_image_url
			) {
				await this.uploadService
					.delete(existing.headlineImageUrl)
					.catch((err) =>
						this.logger.warn(
							`Failed to delete old headline image: ${err.message}`,
						),
					);
			}

			const updated = await this.prisma.searchSpace.update({
				where: { id },
				data: {
					name: updateDto.name,
					description: updateDto.description,
					headlineImageUrl: updateDto.headline_image_url,
				},
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			return this.toDto(updated, membership.role);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update search space: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id },
			});

			if (!searchSpace) {
				throw new NotFoundException("Search space not found");
			}

			if (searchSpace.headlineImageUrl) {
				await this.uploadService
					.delete(searchSpace.headlineImageUrl)
					.catch((err) =>
						this.logger.warn(`Failed to delete headline image: ${err.message}`),
					);
			}

			await this.prisma.searchSpace.delete({
				where: { id },
			});

			return { message: "Search space deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete search space: ${error.message}`,
			);
		}
	}

	async inviteMember(
		searchSpaceId: number,
		inviteDto: InviteMemberDto,
		userId: string,
	): Promise<InviteResponseDto> {
		const INVITE_SUCCESS: InviteResponseDto = {
			message: "If the user exists, they will be added to this search space.",
		};

		const userToInvite = await this.prisma.user.findUnique({
			where: { email: inviteDto.email },
		});

		if (!userToInvite) {
			this.logger.warn(
				`Invite to search space ${searchSpaceId}: no user found for email "${inviteDto.email}" (invited by ${userId})`,
			);
			await this.timingMitigation();
			return INVITE_SUCCESS;
		}

		const existing = await this.prisma.searchSpaceMember.findUnique({
			where: {
				searchSpaceId_userId: {
					searchSpaceId,
					userId: userToInvite.id,
				},
			},
		});

		if (existing) {
			this.logger.log(
				`Invite to search space ${searchSpaceId}: user ${userToInvite.id} is already a member (invited by ${userId})`,
			);
			return INVITE_SUCCESS;
		}

		try {
			await this.prisma.searchSpaceMember.create({
				data: {
					searchSpaceId,
					userId: userToInvite.id,
					role: inviteDto.role,
					invitedById: userId,
				},
			});
		} catch (error) {
			this.logger.error(
				`Invite to search space ${searchSpaceId}: failed to create membership for user ${userToInvite.id}: ${error.message}`,
			);
			throw new InternalServerErrorException(
				"An unexpected error occurred. Please try again.",
			);
		}

		return INVITE_SUCCESS;
	}

	private async timingMitigation(): Promise<void> {
		const jitter = Math.floor(Math.random() * 50) + 25;
		await new Promise((resolve) => setTimeout(resolve, jitter));
	}

	async listMembers(
		searchSpaceId: number,
	): Promise<MemberDto[]> {
		try {
			const members = await this.prisma.searchSpaceMember.findMany({
				where: { searchSpaceId },
				include: { user: true },
				orderBy: { createdAt: "asc" },
			});

			return members.map((m) => this.toMemberDto(m));
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to list members: ${error.message}`,
			);
		}
	}

	async updateMemberRole(
		searchSpaceId: number,
		memberId: string,
		updateDto: UpdateMemberRoleDto,
	): Promise<MemberDto> {
		try {
			const member = await this.prisma.searchSpaceMember.findUnique({
				where: { id: memberId },
			});

			if (!member || member.searchSpaceId !== searchSpaceId) {
				throw new NotFoundException("Member not found in this search space");
			}

			if (member.role === MemberRole.OWNER) {
				throw new ForbiddenException("Cannot change the role of the owner");
			}

			const updated = await this.prisma.searchSpaceMember.update({
				where: { id: memberId },
				data: { role: updateDto.role },
				include: { user: true },
			});

			return this.toMemberDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update member role: ${error.message}`,
			);
		}
	}

	async removeMember(
		searchSpaceId: number,
		memberId: string,
	): Promise<{ message: string }> {
		try {
			const member = await this.prisma.searchSpaceMember.findUnique({
				where: { id: memberId },
			});

			if (!member || member.searchSpaceId !== searchSpaceId) {
				throw new NotFoundException("Member not found in this search space");
			}

			if (member.role === MemberRole.OWNER) {
				throw new ForbiddenException("Cannot remove the owner from the search space");
			}

			await this.prisma.searchSpaceMember.delete({
				where: { id: memberId },
			});

			return { message: "Member removed successfully" };
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to remove member: ${error.message}`,
			);
		}
	}

	async leaveSearchSpace(
		searchSpaceId: number,
		membership: SearchSpaceMembershipAttachment,
	): Promise<{ message: string }> {
		try {
			if (membership.role === MemberRole.OWNER) {
				throw new ForbiddenException(
					"Owner cannot leave the search space. Transfer ownership first or delete the space.",
				);
			}

			await this.prisma.searchSpaceMember.delete({
				where: { id: membership.id },
			});

			return { message: "Left search space successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to leave search space: ${error.message}`,
			);
		}
	}

	private toDto(searchSpace: any, role: MemberRole): SearchSpaceDto {
		const pinnedIds = (searchSpace.pinnedQueryTemplates ?? []).map(
			(p) => p.queryTemplateId,
		);
		return {
			id: searchSpace.id,
			name: searchSpace.name,
			description: searchSpace.description,
			headline_image_url: searchSpace.headlineImageUrl,
			userId: searchSpace.userId,
			pinned_query_template_ids: pinnedIds,
			created_at: searchSpace.createdAt,
			role,
			is_owner: role === MemberRole.OWNER,
		};
	}

	private toMemberDto(member: any): MemberDto {
		return {
			id: member.id,
			user_id: member.userId,
			email: member.user.email,
			full_name: member.user.fullName,
			picture: member.user.picture,
			role: member.role,
			invited_by_id: member.invitedById,
			created_at: member.createdAt,
		};
	}
}
