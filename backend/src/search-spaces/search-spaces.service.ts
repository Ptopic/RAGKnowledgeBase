import {
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { MemberRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
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
	) {}

	async create(
		createDto: CreateSearchSpaceDto,
		userId: string,
	): Promise<SearchSpaceDto> {
		try {
			const searchSpace = await this.prisma.searchSpace.create({
				data: {
					name: createDto.name,
					description: createDto.description,
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
			throw new InternalServerErrorException(
				`Failed to create search space: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 200,
	): Promise<SearchSpaceDto[]> {
		try {
			const accessibleSpaces = await this.permissionsService.getSearchSpacesForUser(userId);
			const spaceIds = accessibleSpaces.map((s) => s.id);

			const searchSpaces = await this.prisma.searchSpace.findMany({
				where: { id: { in: spaceIds } },
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
			const updated = await this.prisma.searchSpace.update({
				where: { id },
				data: {
					name: updateDto.name,
					description: updateDto.description,
				},
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			return this.toDto(updated, membership.role);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update search space: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
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
