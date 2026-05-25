import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { SEARCH_SPACE_ROLES_KEY } from "../permissions/decorators/require-search-space-role.decorator";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("DocumentsController", () => {
	let controller: DocumentsController;
	let documentsService: any;

	const mockMembership = {
		id: "mem-1",
		role: MemberRole.EDITOR,
		searchSpaceId: 5,
		userId: "user-1",
		invitedById: "admin-1",
		createdAt: new Date(),
	};

	beforeEach(async () => {
		documentsService = {
			create: jest.fn(),
			createFileUpload: jest.fn(),
			findAll: jest.fn(),
			search: jest.fn(),
			getTypeCounts: jest.fn(),
			findOne: jest.fn(),
			findOneWithChunks: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			bulkRemove: jest.fn(),
			addFavorite: jest.fn(),
			removeFavorite: jest.fn(),
			getDocumentByChunkId: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DocumentsController],
			providers: [
				{ provide: DocumentsService, useValue: documentsService },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<DocumentsController>(DocumentsController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /documents", () => {
		it("should call service.create without membership", async () => {
			const dto = { content: ["url"], document_type: "CRAWLED_URL", search_space_id: 5 } as any;
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			documentsService.create.mockResolvedValue({ message: "Queued" });

			await controller.create(dto, req);

			expect(documentsService.create).toHaveBeenCalledWith(dto, "user-1");
		});
	});

	describe("GET /documents", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			documentsService.findAll.mockResolvedValue({ items: [], total: 0, favorite_ids: [] });

			await controller.findAll(req);

			const call = documentsService.findAll.mock.calls[0];
			expect(call[0]).toBe("user-1");
			expect(call[1]).toBe(5);
		});
	});

	describe("GET /documents/search", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.search", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			documentsService.search.mockResolvedValue({ items: [], total: 0, favorite_ids: [] });

			await controller.search(req, "test");

			const call = documentsService.search.mock.calls[0];
			expect(call[0]).toBe("user-1");
			expect(call[1]).toBe(5);
			expect(call[2]).toBe("test");
		});
	});

	describe("GET /documents/type-counts", () => {
		it("should pass searchSpaceId from req.searchSpaceContext", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			documentsService.getTypeCounts.mockResolvedValue({});

			await controller.getTypeCounts(req);

			expect(documentsService.getTypeCounts).toHaveBeenCalledWith("user-1", 5);
		});
	});

	describe("GET /documents/:id", () => {
		it("should call service.findOne without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			documentsService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(1, req);

			expect(documentsService.findOne).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("PUT /documents/:id", () => {
		it("should call service.update without membership", async () => {
			const dto = { title: "Updated" } as any;
			const req = { user: { id: "user-1" } } as any;
			documentsService.update.mockResolvedValue({ id: 1 });

			await controller.update(1, dto, req);

			expect(documentsService.update).toHaveBeenCalledWith(1, dto, "user-1");
		});
	});

	describe("DELETE /documents/:id", () => {
		it("should call service.remove without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			documentsService.remove.mockResolvedValue({ message: "Deleted" });

			await controller.remove(1, req);

			expect(documentsService.remove).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("DELETE /documents/bulk", () => {
		it("should call service.bulkRemove with ids and userId", async () => {
			const dto = { ids: [1, 2, 3], search_space_id: 5 } as any;
			const req = { user: { id: "user-1" } } as any;
			const expectedResult = {
				deleted: [1, 2, 3],
				failed: [],
				message: "Bulk delete completed: 3 deleted, 0 failed",
			};
			documentsService.bulkRemove.mockResolvedValue(expectedResult);

			const result = await controller.bulkRemove(dto, req);

			expect(documentsService.bulkRemove).toHaveBeenCalledWith([1, 2, 3], "user-1");
			expect(result).toEqual(expectedResult);
		});

		it("has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.bulkRemove);
			expect(roles).toContain(MemberRole.EDITOR);
		});
	});

	describe("VIEWER permission matrix — document mutations require EDITOR+", () => {
		it("POST create has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.create);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("POST createFileUpload has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.createFileUpload);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("PUT update has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.update);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("DELETE remove has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.remove);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("POST addFavorite has @RequireSearchSpaceRole(VIEWER) — favorite allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.addFavorite);
			expect(roles).toContain(MemberRole.VIEWER);
			expect(roles).not.toContain(MemberRole.EDITOR);
		});

		it("DELETE removeFavorite has @RequireSearchSpaceRole(VIEWER) — unfavorite allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.removeFavorite);
			expect(roles).toContain(MemberRole.VIEWER);
			expect(roles).not.toContain(MemberRole.EDITOR);
		});

		it("GET findAll has @RequireSearchSpaceRole(VIEWER) — read-only allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.findAll);
			expect(roles).toContain(MemberRole.VIEWER);
		});

		it("GET search has @RequireSearchSpaceRole(VIEWER) — read-only allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.search);
			expect(roles).toContain(MemberRole.VIEWER);
		});

		it("GET findOne has @RequireSearchSpaceRole(VIEWER) — read-only allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.findOne);
			expect(roles).toContain(MemberRole.VIEWER);
		});
	});
});
