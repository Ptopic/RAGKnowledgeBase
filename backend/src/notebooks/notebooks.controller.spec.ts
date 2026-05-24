import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";
import { UploadService } from "../upload";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("NotebooksController", () => {
	let controller: NotebooksController;
	let notebooksService: any;

	const mockMembership = {
		id: "mem-1",
		role: MemberRole.EDITOR,
		searchSpaceId: 5,
		userId: "user-1",
		invitedById: "admin-1",
		createdAt: new Date(),
	};

	beforeEach(async () => {
		notebooksService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [NotebooksController],
			providers: [
				{ provide: NotebooksService, useValue: notebooksService },
				{ provide: UploadService, useValue: { upload: jest.fn(), delete: jest.fn(), deleteAllFromContent: jest.fn(), isOwnedUrl: jest.fn() } },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<NotebooksController>(NotebooksController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /searchspaces/:id/notebooks", () => {
		it("should call service.create with dto and userId (no membership)", async () => {
			const dto = { title: "Test", content: "Body" } as any;
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.create.mockResolvedValue({ id: 1 });

			await controller.create(5, dto, req);

			expect(notebooksService.create).toHaveBeenCalledWith(
				{ ...dto, search_space_id: 5 },
				"user-1",
			);
		});
	});

	describe("GET /searchspaces/:id/notebooks", () => {
		it("should call service.findAll with searchSpaceId from params and userId", async () => {
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.findAll.mockResolvedValue({ items: [], total: 0 });

			await controller.findAll(5, req);

			expect(notebooksService.findAll).toHaveBeenCalledWith(
				"user-1", 5, 0, 50, undefined, "all", "created", "desc",
			);
		});
	});

	describe("GET /searchspaces/:id/notebooks/:notebookId", () => {
		it("should call service.findOne with notebookId, searchSpaceId, userId", async () => {
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(5, 1, req);

			expect(notebooksService.findOne).toHaveBeenCalledWith(1, 5, "user-1");
		});
	});

	describe("PUT /searchspaces/:id/notebooks/:notebookId", () => {
		it("should call service.update without membership", async () => {
			const dto = { title: "Updated" } as any;
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.update.mockResolvedValue({ id: 1 });

			await controller.update(5, 1, dto, req);

			expect(notebooksService.update).toHaveBeenCalledWith(1, 5, dto, "user-1");
		});
	});

	describe("DELETE /searchspaces/:id/notebooks/:notebookId", () => {
		it("should call service.remove without membership", async () => {
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.remove.mockResolvedValue({ message: "Deleted" });

			await controller.remove(5, 1, req);

			expect(notebooksService.remove).toHaveBeenCalledWith(1, 5, "user-1");
		});
	});

	describe("POST /searchspaces/:id/notebooks/:notebookId/publish", () => {
		it("should call service.publish without membership", async () => {
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.publish.mockResolvedValue({ id: 1 });

			await controller.publish(5, 1, req);

			expect(notebooksService.publish).toHaveBeenCalledWith(1, 5, "user-1");
		});
	});

	describe("POST /searchspaces/:id/notebooks/:notebookId/unpublish", () => {
		it("should call service.unpublish without membership", async () => {
			const req = { user: { id: "user-1" }, searchSpaceContext: { searchSpaceId: 5, membership: mockMembership } } as any;
			notebooksService.unpublish.mockResolvedValue({ id: 1 });

			await controller.unpublish(5, 1, req);

			expect(notebooksService.unpublish).toHaveBeenCalledWith(1, 5, "user-1");
		});
	});
});
