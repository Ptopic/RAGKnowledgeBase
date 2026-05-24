import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { ChatsController } from "./chats.controller";
import { CreateChatDto, UpdateChatDto, ToggleFavoriteDto } from "./dtos/chat.dto";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

// Use require to avoid ts-jest type-checking the service file
const { ChatsService } = require("./chats.service");

describe("ChatsController", () => {
	let controller: ChatsController;
	let chatsService: any;

	// OWNER/EDITOR membership — used for delete tests (requires EDITOR+)
	const editorMembership = {
		id: "mem-1",
		role: MemberRole.EDITOR,
		searchSpaceId: 1,
		userId: "user-1",
		invitedById: "admin-1",
		createdAt: new Date(),
	};

	// VIEWER membership — used for create/update/read/favorite tests (requires VIEWER+)
	const viewerMembership = {
		id: "mem-2",
		role: MemberRole.VIEWER,
		searchSpaceId: 1,
		userId: "user-1",
		invitedById: "admin-1",
		createdAt: new Date(),
	};

	beforeEach(async () => {
		chatsService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			addFavorite: jest.fn(),
			removeFavorite: jest.fn(),
			findFavorites: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ChatsController],
			providers: [
				{
					provide: ChatsService,
					useValue: chatsService,
				},
				{
					provide: PermissionsService,
					useValue: { getMembership: jest.fn() },
				},
				{
					provide: SearchSpaceAccessGuard,
					useValue: { canActivate: jest.fn().mockResolvedValue(true) },
				},
			],
		}).compile();

		controller = module.get<ChatsController>(ChatsController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /chats", () => {
		it("should call service.create with VIEWER membership (create requires VIEWER+)", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Test Chat",
				messages: [],
				search_space_id: 1,
			};
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;

			const expected = { id: 1, ...dto };
			chatsService.create.mockResolvedValue(expected);

			const result = await controller.create(dto, req);

			expect(chatsService.create).toHaveBeenCalledWith(
				dto,
				"user-1",
			);
			expect(result).toEqual(expected);
		});

		it("should call service.create without membership when guard does not provide it", async () => {
			const dto: CreateChatDto = {
				type: "QNA" as any,
				title: "Test Chat",
				messages: [],
				search_space_id: 1,
			};
			const req = {
				user: { id: "user-1" },
			} as any;

			const expected = { id: 1, ...dto };
			chatsService.create.mockResolvedValue(expected);

			await controller.create(dto, req);

			expect(chatsService.create).toHaveBeenCalledWith(
				dto,
				"user-1",
			);
		});
	});

	describe("GET /chats", () => {
		it("should pass guard-resolved searchSpaceId to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5, membership: viewerMembership },
			} as any;
			chatsService.findAll.mockResolvedValue([]);

			await controller.findAll(req, "0", "50");

			expect(chatsService.findAll).toHaveBeenCalledWith("user-1", 0, 50, 5);
		});

		it("should default skip and limit when not provided", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;
			chatsService.findAll.mockResolvedValue([]);

			await controller.findAll(req);

			expect(chatsService.findAll).toHaveBeenCalledWith("user-1", 0, 100, 1);
		});
	});

	describe("GET /chats/:id", () => {
		it("should call service.findOne with id and userId", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;
			chatsService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(1, req);

			expect(chatsService.findOne).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("PUT /chats/:id", () => {
		it("should call service.update with VIEWER membership (update requires VIEWER+)", async () => {
			const dto: UpdateChatDto = { title: "Updated" };
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;
			chatsService.update.mockResolvedValue({ id: 1 });

			await controller.update(1, dto, req);

			expect(chatsService.update).toHaveBeenCalledWith(1, dto, "user-1");
		});
	});

	describe("DELETE /chats/:id", () => {
		it("should call service.remove with EDITOR membership (delete requires EDITOR+)", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: editorMembership },
			} as any;
			chatsService.remove.mockResolvedValue({ message: "Chat deleted successfully" });

			await controller.remove(1, req);

			expect(chatsService.remove).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("POST /chats/:id/favorite", () => {
		it("should call service.addFavorite with id and userId", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;
			chatsService.addFavorite.mockResolvedValue({ id: 1 });

			await controller.addFavorite(1, {} as ToggleFavoriteDto, req);

			expect(chatsService.addFavorite).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("DELETE /chats/:id/favorite", () => {
		it("should call service.removeFavorite with id and userId", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 1, membership: viewerMembership },
			} as any;
			chatsService.removeFavorite.mockResolvedValue({ message: "Favorite removed successfully" });

			await controller.removeFavorite(1, req);

			expect(chatsService.removeFavorite).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("GET /chats/favorites", () => {
		it("should pass guard-resolved searchSpaceId to service.findFavorites", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5, membership: viewerMembership },
			} as any;
			chatsService.findFavorites.mockResolvedValue([]);

			await controller.findFavorites(req, "0", "20");

			expect(chatsService.findFavorites).toHaveBeenCalledWith("user-1", 0, 20, 5);
		});
	});
});
