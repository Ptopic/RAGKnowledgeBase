import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { ChatsService } from "./chats.service";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import { CreateChatDto, UpdateChatDto } from "./dtos/chat.dto";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

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

	const viewerMembership: SearchSpaceMembershipAttachment = {
		id: "mem-viewer",
		role: MemberRole.VIEWER,
		searchSpaceId: 1,
		userId: "user-viewer",
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
				deleteMany: jest.fn(),
			},
			userChatFavorite: {
				create: jest.fn(),
				deleteMany: jest.fn(),
				findMany: jest.fn(),
			},
		};

		permissionsService = {
			requireRead: jest.fn().mockResolvedValue(undefined),
			requireWrite: jest.fn().mockResolvedValue(undefined),
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
				userId: "user-1",
			});

			await service.create(dto, "user-1", mockMembership);

			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(prisma.chat.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ userId: "user-1" }),
				}),
			);
		});

		it("should call permissionsService.requireRead when membership is absent (internal/non-HTTP path)", async () => {
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
				userId: "user-1",
			});

			await service.create(dto, "user-1");

			expect(permissionsService.requireRead).toHaveBeenCalledWith(1, "user-1");
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
		});

		it("should allow VIEWER to create chat when guard provides VIEWER membership", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Viewer Chat",
				messages: [],
				search_space_id: 1,
			};
			prisma.chat.create.mockResolvedValue({
				id: 2,
				...dto,
				searchSpaceId: 1,
				userId: "user-viewer",
			});

			await service.create(dto, "user-viewer", viewerMembership);

			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
			expect(permissionsService.requireRead).not.toHaveBeenCalled();
			expect(prisma.chat.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ userId: "user-viewer" }),
				}),
			);
		});

		it("should allow VIEWER to create chat via internal path (requireRead, not requireWrite)", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Viewer Internal Chat",
				messages: [],
				search_space_id: 1,
			};
			prisma.chat.create.mockResolvedValue({
				id: 3,
				...dto,
				searchSpaceId: 1,
				userId: "user-viewer",
			});

			await service.create(dto, "user-viewer");

			expect(permissionsService.requireRead).toHaveBeenCalledWith(1, "user-viewer");
			expect(permissionsService.requireWrite).not.toHaveBeenCalled();
		});
	});

	describe("findOne", () => {
		it("should return chat scoped by userId", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});

			const result = await service.findOne(1, "user-1");

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1, userId: "user-1" },
				}),
			);
			expect(result.id).toBe(1);
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.findOne(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("update", () => {
		it("should update chat scoped by userId", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Old",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});
			prisma.chat.update.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "New",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});

			const result = await service.update(1, { title: "New" } as UpdateChatDto, "user-1");

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1, userId: "user-1" },
				}),
			);
			expect(result.title).toBe("New");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.update(999, { title: "New" } as UpdateChatDto, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("remove", () => {
		it("should delete chat scoped by userId", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});
			prisma.chat.delete.mockResolvedValue({});

			const result = await service.remove(1, "user-1");

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1, userId: "user-1" },
				}),
			);
			expect(result.message).toBe("Chat deleted successfully");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.remove(999, "user-1")).rejects.toThrow(NotFoundException);
		});

		it("should allow user to delete their own chat", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "My Chat",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});
			prisma.chat.delete.mockResolvedValue({});

			const result = await service.remove(1, "user-1");

			expect(result.message).toBe("Chat deleted successfully");
			expect(prisma.chat.delete).toHaveBeenCalledWith({ where: { id: 1 } });
		});

		it("should throw NotFoundException when user tries to delete another user's chat", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.remove(1, "user-2")).rejects.toThrow(NotFoundException);
			expect(prisma.chat.delete).not.toHaveBeenCalled();
		});
	});

	describe("bulkRemove", () => {
		it("should delete multiple chats owned by the user in the search space and return deleted ids", async () => {
			prisma.chat.findMany.mockResolvedValue([
				{ id: 1 },
				{ id: 2 },
			]);
			prisma.chat.deleteMany.mockResolvedValue({ count: 2 });

			const result = await service.bulkRemove([1, 2], "user-1", 1);

			expect(result.deleted).toEqual([1, 2]);
			expect(result.failed).toEqual([]);
			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: { in: [1, 2] }, userId: "user-1", searchSpaceId: 1 },
				}),
			);
			expect(prisma.chat.deleteMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: { in: [1, 2] } },
				}),
			);
		});

		it("should return failed entries for chats not found or not owned", async () => {
			prisma.chat.findMany.mockResolvedValue([]);
			prisma.chat.deleteMany.mockResolvedValue({ count: 0 });

			const result = await service.bulkRemove([999, 1000], "user-1", 1);

			expect(result.deleted).toEqual([]);
			expect(result.failed).toEqual([
				{ id: 999, reason: "Chat not found or you do not have permission to access it" },
				{ id: 1000, reason: "Chat not found or you do not have permission to access it" },
			]);
			expect(prisma.chat.deleteMany).not.toHaveBeenCalled();
		});

		it("should handle mixed success and failure", async () => {
			prisma.chat.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);
			prisma.chat.deleteMany.mockResolvedValue({ count: 2 });

			const result = await service.bulkRemove([1, 2, 3], "user-1", 1);

			expect(result.deleted).toEqual([1, 3]);
			expect(result.failed).toEqual([
				{ id: 2, reason: "Chat not found or you do not have permission to access it" },
			]);
		});

		it("should scope by searchSpaceId to prevent cross-space deletion", async () => {
			prisma.chat.findMany.mockResolvedValue([{ id: 1 }]);
			prisma.chat.deleteMany.mockResolvedValue({ count: 1 });

			await service.bulkRemove([1, 2], "user-1", 5);

			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: { in: [1, 2] }, userId: "user-1", searchSpaceId: 5 },
				}),
			);
		});

		it("should throw BadRequestException when ids array is empty", async () => {
			await expect(service.bulkRemove([], "user-1", 1)).rejects.toThrow(BadRequestException);
			await expect(service.bulkRemove([], "user-1", 1)).rejects.toThrow("ids array must not be empty");
		});
	});

	describe("addFavorite", () => {
		it("should add favorite scoped by userId", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});
			prisma.userChatFavorite.create.mockResolvedValue({});

			const result = await service.addFavorite(1, "user-1");

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1, userId: "user-1" },
				}),
			);
			expect(result.id).toBe(1);
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.addFavorite(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("removeFavorite", () => {
		it("should remove favorite scoped by userId", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				type: "QNA",
				title: "Test",
				initialConnectors: [],
				messages: [],
				searchSpaceId: 1,
				userId: "user-1",
				createdAt: new Date(),
			});
			prisma.userChatFavorite.deleteMany.mockResolvedValue({ count: 1 });

			const result = await service.removeFavorite(1, "user-1");

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1, userId: "user-1" },
				}),
			);
			expect(result.message).toBe("Favorite removed successfully");
		});

		it("should throw NotFoundException when chat does not exist", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.removeFavorite(999, "user-1")).rejects.toThrow(NotFoundException);
		});
	});

	describe("findAll", () => {
		it("should query by searchSpaceId and userId (user-scoped)", async () => {
			prisma.chat.findMany.mockResolvedValue([]);

			await service.findAll("user-1", 0, 50, 5);

			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { searchSpaceId: 5, userId: "user-1" },
				}),
			);
		});

		it("should only return chats owned by the requesting user", async () => {
			const user1Chats = [
				{ id: 1, title: "Chat 1", searchSpaceId: 5, userId: "user-1", favorites: [] },
				{ id: 2, title: "Chat 2", searchSpaceId: 5, userId: "user-1", favorites: [] },
			];
			prisma.chat.findMany.mockResolvedValue(user1Chats);

			const result = await service.findAll("user-1", 0, 50, 5);

			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { searchSpaceId: 5, userId: "user-1" },
				}),
			);
			expect(result).toHaveLength(2);
		});

		it("should not return chats owned by another user in same search space", async () => {
			prisma.chat.findMany.mockResolvedValue([]);

			const result = await service.findAll("user-2", 0, 50, 5);

			expect(prisma.chat.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { searchSpaceId: 5, userId: "user-2" },
				}),
			);
			expect(result).toHaveLength(0);
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
