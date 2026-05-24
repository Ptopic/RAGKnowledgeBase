import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MailService } from "src/mail/mail.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SearchSpaceInvitationsService } from "./search-space-invitations.service";

const mockInviter = {
	id: "inviter-id",
	email: "inviter@example.com",
	fullName: "Inviter User",
};

const mockInviteeUser = {
	id: "invitee-user-id",
	email: "invitee@example.com",
	fullName: "Invitee User",
};

const mockSearchSpace = {
	id: 1,
	name: "Test Space",
	description: "A test space",
	userId: "inviter-id",
};

const mockInvitation = {
	id: 1,
	searchSpaceId: 1,
	inviterId: "inviter-id",
	inviteeEmail: "invitee@example.com",
	token: "abc123token",
	status: "PENDING",
	expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	createdAt: new Date(),
};

const mockMemberId = randomUUID();

const mockPrisma = {
	user: {
		findUnique: jest.fn(),
	},
	searchSpace: {
		findUnique: jest.fn(),
	},
	searchSpaceMember: {
		findUnique: jest.fn(),
		create: jest.fn(),
		delete: jest.fn(),
		findMany: jest.fn(),
	},
	searchSpaceInvitation: {
		create: jest.fn(),
		findUnique: jest.fn(),
		findFirst: jest.fn(),
		findMany: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
	$transaction: jest.fn((fn) => fn({
		searchSpaceMember: {
			create: jest.fn().mockResolvedValue({
				id: mockMemberId,
				userId: "invitee-user-id",
				searchSpaceId: 1,
				role: "VIEWER",
				invitedById: "inviter-id",
			}),
		},
		searchSpaceInvitation: {
			update: jest.fn().mockResolvedValue({ ...mockInvitation, status: "ACCEPTED", acceptedBy: "invitee-user-id" }),
		},
	})),
};

const mockMailService = {
	sendSearchSpaceInvitationEmail: jest.fn().mockResolvedValue(undefined),
};

describe("SearchSpaceInvitationsService", () => {
	let service: SearchSpaceInvitationsService;
	let prisma: typeof mockPrisma;
	let mailService: typeof mockMailService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SearchSpaceInvitationsService,
				{
					provide: PrismaService,
					useValue: mockPrisma,
				},
				{
					provide: MailService,
					useValue: mockMailService,
				},
			],
		}).compile();

		service = module.get<SearchSpaceInvitationsService>(SearchSpaceInvitationsService);
		prisma = module.get(PrismaService);
		mailService = module.get(MailService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("createInvite", () => {
		const dto = { inviteeEmail: "invitee@example.com" };
		const searchSpaceId = 1;

		it("should create an invitation and send email", async () => {
			prisma.user.findUnique
				.mockResolvedValueOnce(mockInviter)
				.mockResolvedValueOnce(mockInviteeUser);
			prisma.searchSpace.findUnique.mockResolvedValue(mockSearchSpace);
			prisma.searchSpaceMember.findUnique.mockResolvedValue(null);
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(null);
			prisma.searchSpaceInvitation.create.mockResolvedValue(mockInvitation);

			const result = await service.createInvite("inviter-id", searchSpaceId, dto);

			expect(prisma.searchSpaceInvitation.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						searchSpaceId: 1,
						inviterId: "inviter-id",
						inviteeEmail: "invitee@example.com",
						status: "PENDING",
					}),
				}),
			);
			expect(mailService.sendSearchSpaceInvitationEmail).toHaveBeenCalledWith(
				"invitee@example.com",
				"Inviter User",
				"Test Space",
				expect.any(String),
			);
			expect(result.inviteeEmail).toBe("invitee@example.com");
			expect(result.status).toBe("PENDING");
		});

		it("should throw BadRequestException when inviting self", async () => {
			prisma.user.findUnique.mockResolvedValueOnce(mockInviter);

			await expect(
				service.createInvite("inviter-id", searchSpaceId, {
					inviteeEmail: "inviter@example.com",
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw ConflictException when duplicate pending invite exists", async () => {
			prisma.user.findUnique
				.mockResolvedValueOnce(mockInviter)
				.mockResolvedValueOnce(mockInviteeUser);
			prisma.searchSpace.findUnique.mockResolvedValue(mockSearchSpace);
			prisma.searchSpaceMember.findUnique.mockResolvedValue(null);
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(mockInvitation);

			await expect(service.createInvite("inviter-id", searchSpaceId, dto)).rejects.toThrow(
				ConflictException,
			);
		});

		it("should throw ConflictException when invitee is already a member", async () => {
			prisma.user.findUnique
				.mockResolvedValueOnce(mockInviter)
				.mockResolvedValueOnce(mockInviteeUser);
			prisma.searchSpace.findUnique.mockResolvedValue(mockSearchSpace);
			prisma.searchSpaceMember.findUnique.mockResolvedValue({
				id: mockMemberId,
				userId: "invitee-user-id",
				searchSpaceId: 1,
				role: "VIEWER",
				invitedById: "inviter-id",
			});

			await expect(service.createInvite("inviter-id", searchSpaceId, dto)).rejects.toThrow(
				ConflictException,
			);
		});

		it("should throw NotFoundException when search space not found", async () => {
			prisma.user.findUnique.mockResolvedValueOnce(mockInviter);
			prisma.searchSpace.findUnique.mockResolvedValue(null);

			await expect(service.createInvite("inviter-id", searchSpaceId, dto)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("getInvitationByToken", () => {
		it("should return invitation details", async () => {
			const invitationWithIncludes = {
				...mockInvitation,
				searchSpace: { name: "Test Space" },
				inviter: { fullName: "Inviter User", email: "inviter@example.com" },
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				invitationWithIncludes,
			);

			const result = await service.getInvitationByToken("abc123token");

			expect(result.searchSpaceName).toBe("Test Space");
			expect(result.inviterName).toBe("Inviter User");
			expect(result.status).toBe("PENDING");
		});

		it("should throw NotFoundException when token not found", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(null);

			await expect(
				service.getInvitationByToken("nonexistent"),
			).rejects.toThrow(NotFoundException);
		});

		it("should auto-expire pending invitation past expiry", async () => {
			const expiredInvitation = {
				...mockInvitation,
				expiresAt: new Date(Date.now() - 1000),
				status: "PENDING",
				searchSpace: { name: "Test Space" },
				inviter: { fullName: "Inviter User", email: "inviter@example.com" },
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				expiredInvitation,
			);
			prisma.searchSpaceInvitation.update.mockResolvedValue({
				...expiredInvitation,
				status: "EXPIRED",
			});

			const result = await service.getInvitationByToken("abc123token");

			expect(prisma.searchSpaceInvitation.update).toHaveBeenCalledWith({
				where: { id: expiredInvitation.id },
				data: { status: "EXPIRED" },
			});
			expect(result.status).toBe("EXPIRED");
		});
	});

	describe("acceptInvitation", () => {
		it("should accept a valid pending invitation", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue(mockInviteeUser);
			prisma.searchSpaceMember.findUnique.mockResolvedValue(null);

			const result = await service.acceptInvitation(
				"abc123token",
				"invitee-user-id",
			);

			expect(prisma.$transaction).toHaveBeenCalled();
			expect(result.message).toBe("Invitation accepted successfully");
		});

		it("should return success when already accepted (idempotent)", async () => {
			const acceptedInvitation = {
				...mockInvitation,
				status: "ACCEPTED",
				acceptedBy: "invitee-user-id",
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				acceptedInvitation,
			);

			const result = await service.acceptInvitation(
				"abc123token",
				"invitee-user-id",
			);

			expect(result.message).toBe("Invitation already accepted");
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it("should return success when member already exists (idempotent)", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue(mockInviteeUser);
			prisma.searchSpaceMember.findUnique.mockResolvedValue({
				id: mockMemberId,
				userId: "invitee-user-id",
				searchSpaceId: 1,
				role: "VIEWER",
				invitedById: "inviter-id",
			});

			const result = await service.acceptInvitation(
				"abc123token",
				"invitee-user-id",
			);

			expect(result.message).toBe("Invitation accepted successfully");
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException when invitation has expired", async () => {
			const expiredInvitation = {
				...mockInvitation,
				expiresAt: new Date(Date.now() - 1000),
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				expiredInvitation,
			);
			prisma.searchSpaceInvitation.update.mockResolvedValue({
				...expiredInvitation,
				status: "EXPIRED",
			});

			await expect(
				service.acceptInvitation("abc123token", "invitee-user-id"),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw NotFoundException when invitation not found", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(null);

			await expect(
				service.acceptInvitation("nonexistent", "invitee-user-id"),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw BadRequestException when invitation is not PENDING", async () => {
			const declinedInvitation = {
				...mockInvitation,
				status: "DECLINED",
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				declinedInvitation,
			);

			await expect(
				service.acceptInvitation("abc123token", "invitee-user-id"),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw ForbiddenException when wrong user tries to accept", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue({
				...mockInviteeUser,
				id: "other-user-id",
				email: "other@example.com",
			});

			await expect(
				service.acceptInvitation("abc123token", "other-user-id"),
			).rejects.toThrow(ForbiddenException);
		});

		it("should throw ForbiddenException when user not found", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(
				service.acceptInvitation("abc123token", "nonexistent-user-id"),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("declineInvitation", () => {
		it("should decline a pending invitation", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue(mockInviteeUser);
			prisma.searchSpaceInvitation.update.mockResolvedValue({
				...mockInvitation,
				status: "DECLINED",
			});

			const result = await service.declineInvitation(
				"abc123token",
				"invitee-user-id",
			);

			expect(prisma.searchSpaceInvitation.update).toHaveBeenCalledWith({
				where: { id: mockInvitation.id },
				data: { status: "DECLINED" },
			});
			expect(result.message).toBe("Invitation declined");
		});

		it("should throw BadRequestException when invitation is already accepted", async () => {
			const acceptedInvitation = {
				...mockInvitation,
				status: "ACCEPTED",
			};
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(
				acceptedInvitation,
			);

			await expect(
				service.declineInvitation("abc123token", "invitee-user-id"),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw NotFoundException when invitation not found", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(null);

			await expect(
				service.declineInvitation("nonexistent", "invitee-user-id"),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw ForbiddenException when wrong user tries to decline", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue({
				...mockInviteeUser,
				id: "other-user-id",
				email: "other@example.com",
			});

			await expect(
				service.declineInvitation("abc123token", "other-user-id"),
			).rejects.toThrow(ForbiddenException);
		});

		it("should throw ForbiddenException when user not found", async () => {
			prisma.searchSpaceInvitation.findUnique.mockResolvedValue(mockInvitation);
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(
				service.declineInvitation("abc123token", "nonexistent-user-id"),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("getMyInvitations", () => {
		it("should return pending invitations for user email", async () => {
			prisma.user.findUnique.mockResolvedValue(mockInviteeUser);
			prisma.searchSpaceInvitation.findMany.mockResolvedValue([
				{
					...mockInvitation,
					searchSpace: { name: "Test Space" },
					inviter: { fullName: "Inviter User", email: "inviter@example.com" },
				},
			]);

			const result = await service.getMyInvitations("invitee-user-id");

			expect(prisma.searchSpaceInvitation.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						inviteeEmail: "invitee@example.com",
						status: "PENDING",
						expiresAt: { gt: expect.any(Date) },
					}),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].searchSpaceName).toBe("Test Space");
		});

		it("should throw NotFoundException when user not found", async () => {
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(
				service.getMyInvitations("nonexistent"),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("getPendingInvitations", () => {
		it("should return pending invitations for a search space", async () => {
			prisma.searchSpaceInvitation.findMany.mockResolvedValue([
				{
					...mockInvitation,
					searchSpace: { name: "Test Space" },
					inviter: { fullName: "Inviter User", email: "inviter@example.com" },
				},
			]);

			const result = await service.getPendingInvitations(1);

			expect(prisma.searchSpaceInvitation.findMany).toHaveBeenCalledWith({
				where: {
					searchSpaceId: 1,
					status: "PENDING",
					expiresAt: { gt: expect.any(Date) },
				},
				include: {
					searchSpace: { select: { name: true } },
					inviter: { select: { fullName: true, email: true } },
				},
				orderBy: { createdAt: "desc" },
			});
			expect(result).toHaveLength(1);
			expect(result[0].searchSpaceName).toBe("Test Space");
		});

		it("should return empty array when no pending invitations exist", async () => {
			prisma.searchSpaceInvitation.findMany.mockResolvedValue([]);

			const result = await service.getPendingInvitations(1);

			expect(result).toEqual([]);
		});
	});

	describe("cancelInvitation", () => {
		it("should delete a pending invitation", async () => {
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(mockInvitation);
			prisma.searchSpaceInvitation.delete.mockResolvedValue(mockInvitation);

			const result = await service.cancelInvitation(1, 1);

			expect(prisma.searchSpaceInvitation.findFirst).toHaveBeenCalledWith({
				where: { id: 1, searchSpaceId: 1 },
			});
			expect(prisma.searchSpaceInvitation.delete).toHaveBeenCalledWith({
				where: { id: 1 },
			});
			expect(result.message).toBe("Invitation cancelled");
		});

		it("should throw NotFoundException when invitation not found", async () => {
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(null);

			await expect(
				service.cancelInvitation(999, 1),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw BadRequestException when invitation is not PENDING (ACCEPTED)", async () => {
			const acceptedInvitation = {
				...mockInvitation,
				status: "ACCEPTED",
			};
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(
				acceptedInvitation,
			);

			await expect(
				service.cancelInvitation(1, 1),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException when invitation is DECLINED", async () => {
			const declinedInvitation = {
				...mockInvitation,
				status: "DECLINED",
			};
			prisma.searchSpaceInvitation.findFirst.mockResolvedValue(
				declinedInvitation,
			);

			await expect(
				service.cancelInvitation(1, 1),
			).rejects.toThrow(BadRequestException);
		});
	});
});
