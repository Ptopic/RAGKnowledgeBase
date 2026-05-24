import { randomBytes, randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { MailService } from "src/mail/mail.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
	CreateInvitationDto,
	InvitationResponseDto,
} from "./dtos/invitation.dto";

@Injectable()
export class SearchSpaceInvitationsService {
	constructor(
		private prisma: PrismaService,
		private mailService: MailService,
	) {}

	async createInvite(
		inviterId: string,
		searchSpaceId: number,
		dto: CreateInvitationDto,
	): Promise<InvitationResponseDto> {
		const { inviteeEmail } = dto;

		const inviter = await this.prisma.user.findUnique({
			where: { id: inviterId },
		});
		if (!inviter) {
			throw new NotFoundException("Inviter not found");
		}

		if (inviter.email === inviteeEmail) {
			throw new BadRequestException("You cannot invite yourself");
		}

		const searchSpace = await this.prisma.searchSpace.findUnique({
			where: { id: searchSpaceId },
		});
		if (!searchSpace) {
			throw new NotFoundException("Search space not found");
		}

		const inviteeUser = await this.prisma.user.findUnique({
			where: { email: inviteeEmail },
		});

		if (inviteeUser) {
			const existingMembership =
				await this.prisma.searchSpaceMember.findUnique({
					where: {
						searchSpaceId_userId: {
							userId: inviteeUser.id,
							searchSpaceId,
						},
					},
				});
			if (existingMembership) {
				throw new ConflictException(
					"This user is already a member of the search space",
				);
			}
		}

		const existingPendingInvite =
			await this.prisma.searchSpaceInvitation.findFirst({
				where: {
					inviteeEmail,
					searchSpaceId,
					status: "PENDING",
				},
			});
		if (existingPendingInvite) {
			throw new ConflictException(
				"A pending invitation already exists for this email and search space",
			);
		}

		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		const invitation = await this.prisma.searchSpaceInvitation.create({
			data: {
				searchSpaceId,
				inviterId,
				inviteeEmail,
				token,
				status: "PENDING",
				expiresAt,
			},
		});

		await this.mailService.sendSearchSpaceInvitationEmail(
			inviteeEmail,
			inviter.fullName ?? inviter.email,
			searchSpace.name,
			token,
		);

		return this.toResponseDto(invitation, searchSpace.name, inviter.fullName ?? inviter.email);
	}

	async getInvitationByToken(token: string): Promise<InvitationResponseDto> {
		const invitation = await this.prisma.searchSpaceInvitation.findUnique({
			where: { token },
			include: {
				searchSpace: { select: { name: true } },
				inviter: { select: { fullName: true, email: true } },
			},
		});

		if (!invitation) {
			throw new NotFoundException("Invitation not found");
		}

		if (
			invitation.status === "PENDING" &&
			invitation.expiresAt < new Date()
		) {
			await this.prisma.searchSpaceInvitation.update({
				where: { id: invitation.id },
				data: { status: "EXPIRED" },
			});
			invitation.status = "EXPIRED";
		}

		return this.toResponseDto(
			invitation,
			invitation.searchSpace.name,
			invitation.inviter.fullName ?? invitation.inviter.email,
		);
	}

	async acceptInvitation(
		token: string,
		userId: string,
	): Promise<{ message: string }> {
		const invitation = await this.prisma.searchSpaceInvitation.findUnique({
			where: { token },
		});

		if (!invitation) {
			throw new NotFoundException("Invitation not found");
		}

		if (invitation.status === "ACCEPTED") {
			return { message: "Invitation already accepted" };
		}

		if (invitation.status !== "PENDING") {
			throw new BadRequestException(
				`Invitation cannot be accepted (status: ${invitation.status})`,
			);
		}

		if (invitation.expiresAt < new Date()) {
			await this.prisma.searchSpaceInvitation.update({
				where: { id: invitation.id },
				data: { status: "EXPIRED" },
			});
			throw new BadRequestException("Invitation has expired");
		}

		// Verify the authenticated user is the invitee
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user || user.email !== invitation.inviteeEmail) {
			throw new ForbiddenException(
				"Only the invited user can accept this invitation",
			);
		}

		// Idempotency: check if member already exists
		const existingMember = await this.prisma.searchSpaceMember.findUnique({
			where: {
				searchSpaceId_userId: {
					userId,
					searchSpaceId: invitation.searchSpaceId,
				},
			},
		});
		if (existingMember) {
			return { message: "Invitation accepted successfully" };
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.searchSpaceMember.create({
				data: {
					id: randomUUID(),
					userId,
					searchSpaceId: invitation.searchSpaceId,
					role: "VIEWER",
					invitedById: invitation.inviterId,
				},
			});

			await tx.searchSpaceInvitation.update({
				where: { id: invitation.id },
				data: {
					status: "ACCEPTED",
					acceptedBy: userId,
				},
			});
		});

		return { message: "Invitation accepted successfully" };
	}

	async declineInvitation(
		token: string,
		userId: string,
	): Promise<{ message: string }> {
		const invitation = await this.prisma.searchSpaceInvitation.findUnique({
			where: { token },
		});

		if (!invitation) {
			throw new NotFoundException("Invitation not found");
		}

		if (invitation.status !== "PENDING") {
			throw new BadRequestException(
				`Invitation cannot be declined (status: ${invitation.status})`,
			);
		}

		// Verify the authenticated user is the invitee
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user || user.email !== invitation.inviteeEmail) {
			throw new ForbiddenException(
				"Only the invited user can decline this invitation",
			);
		}

		await this.prisma.searchSpaceInvitation.update({
			where: { id: invitation.id },
			data: { status: "DECLINED" },
		});

		return { message: "Invitation declined" };
	}

	async getPendingInvitations(searchSpaceId: number): Promise<InvitationResponseDto[]> {
		const invitations = await this.prisma.searchSpaceInvitation.findMany({
			where: {
				searchSpaceId,
				status: "PENDING",
				expiresAt: { gt: new Date() },
			},
			include: {
				searchSpace: { select: { name: true } },
				inviter: { select: { fullName: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return invitations.map((inv) =>
			this.toResponseDto(
				inv,
				inv.searchSpace.name,
				inv.inviter.fullName ?? inv.inviter.email,
			),
		);
	}

	async cancelInvitation(
		invitationId: number,
		searchSpaceId: number,
	): Promise<{ message: string }> {
		const invitation = await this.prisma.searchSpaceInvitation.findFirst({
			where: { id: invitationId, searchSpaceId },
		});

		if (!invitation) {
			throw new NotFoundException("Invitation not found");
		}

		if (invitation.status !== "PENDING") {
			throw new BadRequestException(
				`Invitation cannot be cancelled (status: ${invitation.status})`,
			);
		}

		await this.prisma.searchSpaceInvitation.delete({
			where: { id: invitationId },
		});

		return { message: "Invitation cancelled" };
	}

	async getMyInvitations(userId: string): Promise<InvitationResponseDto[]> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}

		const invitations = await this.prisma.searchSpaceInvitation.findMany({
			where: {
				inviteeEmail: user.email,
				status: "PENDING",
				expiresAt: { gt: new Date() },
			},
			include: {
				searchSpace: { select: { name: true } },
				inviter: { select: { fullName: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return invitations.map((inv) =>
			this.toResponseDto(
				inv,
				inv.searchSpace.name,
				inv.inviter.fullName ?? inv.inviter.email,
			),
		);
	}

	private toResponseDto(
		invitation: {
			id: number;
			searchSpaceId: number;
			inviterId: string;
			inviteeEmail: string;
			status: string;
			expiresAt: Date;
			createdAt: Date;
		},
		searchSpaceName?: string,
		inviterName?: string,
	): InvitationResponseDto {
		return {
			id: invitation.id,
			searchSpaceId: invitation.searchSpaceId,
			inviterId: invitation.inviterId,
			inviteeEmail: invitation.inviteeEmail,
			status: invitation.status,
			expiresAt: invitation.expiresAt,
			createdAt: invitation.createdAt,
			searchSpaceName,
			inviterName,
		};
	}
}
