import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { SEARCH_SPACE_ROLES_KEY } from "../permissions/decorators/require-search-space-role.decorator";
import { SearchSourceConnectorsController } from "./search-source-connectors.controller";
import { SearchSourceConnectorsService } from "./search-source-connectors.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("SearchSourceConnectorsController", () => {
	let controller: SearchSourceConnectorsController;
	let connectorsService: any;

	beforeEach(async () => {
		connectorsService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			indexConnectorContent: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SearchSourceConnectorsController],
			providers: [
				{ provide: SearchSourceConnectorsService, useValue: connectorsService },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<SearchSourceConnectorsController>(SearchSourceConnectorsController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /search-source-connectors", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.create", async () => {
			const dto = { name: "Slack", connector_type: "SLACK_CONNECTOR" } as any;
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			connectorsService.create.mockResolvedValue({ id: 1 });

			await controller.create(dto, req);

			expect(connectorsService.create).toHaveBeenCalledWith(dto, 5, "user-1");
		});
	});

	describe("GET /search-source-connectors", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			connectorsService.findAll.mockResolvedValue([]);

			await controller.findAll(req);

			expect(connectorsService.findAll).toHaveBeenCalledWith("user-1", 0, 100, 5, undefined);
		});

		it("should pass name query param to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			connectorsService.findAll.mockResolvedValue([]);

			await controller.findAll(req, undefined, undefined, "Slack");

			expect(connectorsService.findAll).toHaveBeenCalledWith("user-1", 0, 100, 5, "Slack");
		});
	});

	describe("GET /search-source-connectors/:id", () => {
		it("should call service.findOne without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			connectorsService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(1, req);

			expect(connectorsService.findOne).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("PUT /search-source-connectors/:id", () => {
		it("should call service.update without membership", async () => {
			const dto = { name: "Updated" } as any;
			const req = { user: { id: "user-1" } } as any;
			connectorsService.update.mockResolvedValue({ id: 1 });

			await controller.update(1, dto, req);

			expect(connectorsService.update).toHaveBeenCalledWith(1, dto, "user-1");
		});
	});

	describe("DELETE /search-source-connectors/:id", () => {
		it("should call service.remove without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			connectorsService.remove.mockResolvedValue({ message: "Deleted" });

			await controller.remove(1, req);

			expect(connectorsService.remove).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("VIEWER permission matrix — connector mutations require EDITOR+", () => {
		it("POST create has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.create);
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

		it("POST indexConnectorContent has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.indexConnectorContent);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("POST listGitHubRepositories has @RequireSearchSpaceRole(EDITOR) — VIEWER blocked", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.listGitHubRepositories);
			expect(roles).toContain(MemberRole.EDITOR);
		});

		it("GET findAll has @RequireSearchSpaceRole(VIEWER) — read allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.findAll);
			expect(roles).toContain(MemberRole.VIEWER);
		});

		it("GET findOne has @RequireSearchSpaceRole(VIEWER) — read allowed for VIEWER", () => {
			const roles = Reflect.getMetadata(SEARCH_SPACE_ROLES_KEY, controller.findOne);
			expect(roles).toContain(MemberRole.VIEWER);
		});
	});
});
