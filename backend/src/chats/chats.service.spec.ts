import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { ChatsService } from "./chats.service";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import { CreateChatDto, UpdateChatDto } from "./dtos/chat.dto";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("ChatsService", () => {
	let service: ChatsService;
	let prisma: any;
	let permissionsService: any;

	const mockMembership: SearchSpaceMembershipAttachment = {
		id: "mem-1",
		role: MemberRole.EDITOR,
		searchSpaceId: 1,
		userId: "user-1",
		invitedById: "admin-1",
		createdAt: new Date(),
	};

	beforeEach(async () => {
		prisma = {
			chat: {
				create: jest.fn(),
				findMany: jest.fn(),
				findFirst: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			userChatFavorite: {
				create: jest.fn(),
				deleteMany: jest.fn(),
				findMany: jest.fn(),
			},
		};

		permissionsService = {
			requireWrite: jest.fn().mockResolvedValue(undefined),
			requireRead: jest.fn().mockResolvedValue(undefined),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChatsService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: PermissionsService, useValue: permissionsService },
			],
		}).compile();

		service = module.get<ChatsService>(ChatsService);
		jest.clearAllMocks();
	});

	describe("create", () => {
		it("should skip permissionsService.requireWrite when membership is provided (HTTP/guarded path)", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Test",
				messages: [],
				search_space_id: 1,
			};
			prisma.chat.create.mockResolvedValue({
				id: 1,
				...dto,
				searchSpaceId: 1,
			});

			await service.create(dto, "user-1", mockMembership);

			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(prisma.chat.create).toHaveBeenCalled();
		});

		it("should call permissionsService.requireWrite when membership is absent (internal/non-HTTP path)", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Test",
				messages: [],
				search_space_id: 1,
			};
			prisma.chat.create.mockResolvedValue({
				id: 1,
				...dto,
				searchSpaceId: 1,
			});

			await service.create(dto, "user-1");

			expect(permissionsService.requireWrite).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("findOne", () => {
		it("should return chat without calling permissionsService (guard enforces access)", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});

			const result = await service.findOne(1, "user-1");

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(result.id).toBe(1);
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.findOne(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("update", () => {
		it("should update chat without calling permissionsService (guard enforces access)", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Old",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});
			prisma.chat.update.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "New",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});

			const result = await service.update(1, { title: "New" } as UpdateChatDto, "user-1");

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(result.title).toBe("New");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.update(999, { title: "New" } as UpdateChatDto, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("remove", () => {
		it("should delete chat without calling permissionsService (guard enforces access)", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});
			prisma.chat.delete.mockResolvedValue({});

			const result = await service.remove(1, "user-1");

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(result.message).toBe("Chat deleted successfully");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.remove(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("addFavorite", () => {
		it("should add favorite without calling permissionsService (guard enforces access)", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});
			prisma.userChatFavorite.create.mockResolvedValue({});

			const result = await service.addFavorite(1, "user-1");

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(result.id).toBe(1);
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.addFavorite(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("removeFavorite", () => {
		it("should remove favorite without calling permissionsService (guard enforces access)", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				createdAt: new Date(),
			});
			prisma.userChatFavorite.deleteMany.mockResolvedValue({ count: 1 });

			const result = await service.removeFavorite(1, "user-1");

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(result.message).toBe("Favorite removed successfully");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.removeFavorite(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("findAll", () => {
		it("should query by searchSpaceId without permissionsService (guard enforces access)", async () => {
			prisma.chat.findMany.mockResolvedValue([]);

			await service.findAll("user-1", 0, 50, 5);

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { searchSpaceId: 5 },
				}),
			);
		});
	});

	describe("findFavorites", () => {
		it("should query by searchSpaceId without permissionsService (guard enforces access)", async () => {
			prisma.userChatFavorite.findMany.mockResolvedValue([]);

			await service.findFavorites("user-1", 0, 50, 5);

			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(prisma.userChatFavorite.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						userId: "user-1",
						chat: { searchSpaceId: 5 },
					},
				}),
			);
		});
	});
});
