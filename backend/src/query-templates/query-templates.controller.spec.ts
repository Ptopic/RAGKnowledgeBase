import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { QueryTemplatesController } from "./query-templates.controller";
import { QueryTemplatesService } from "./query-templates.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("QueryTemplatesController", () => {
	let controller: QueryTemplatesController;
	let queryTemplatesService: any;

	beforeEach(async () => {
		queryTemplatesService = {
			createGlobal: jest.fn(),
			findAllGlobal: jest.fn(),
			updateGlobal: jest.fn(),
			removeGlobal: jest.fn(),
			createForSearchSpace: jest.fn(),
			findAllForSearchSpace: jest.fn(),
			removeForSearchSpace: jest.fn(),
			updateForSearchSpace: jest.fn(),
			pinQueryTemplate: jest.fn(),
			unpinQueryTemplate: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [QueryTemplatesController],
			providers: [
				{ provide: QueryTemplatesService, useValue: queryTemplatesService },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<QueryTemplatesController>(QueryTemplatesController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("Space-scoped routes", () => {
		it("POST should call createForSearchSpace without membership", async () => {
			const dto = { title: "Test", content: "Query" } as any;
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.createForSearchSpace.mockResolvedValue({ id: 1 });

			await controller.createForSearchSpace(5, dto, req);

			expect(queryTemplatesService.createForSearchSpace).toHaveBeenCalledWith(5, dto, "user-1");
		});

		it("GET should call findAllForSearchSpace without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.findAllForSearchSpace.mockResolvedValue({ items: [], total: 0 });

			await controller.findAllForSearchSpace(5, req);

			expect(queryTemplatesService.findAllForSearchSpace).toHaveBeenCalledWith(5, "user-1", undefined, 0, 100);
		});

		it("DELETE should call removeForSearchSpace without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.removeForSearchSpace.mockResolvedValue({ message: "Deleted" });

			await controller.removeForSearchSpace(5, 1, req);

			expect(queryTemplatesService.removeForSearchSpace).toHaveBeenCalledWith(1, 5, "user-1");
		});

		it("PUT should call updateForSearchSpace without membership", async () => {
			const dto = { title: "Updated" } as any;
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.updateForSearchSpace.mockResolvedValue({ id: 1 });

			await controller.updateForSearchSpace(5, 1, dto, req);

			expect(queryTemplatesService.updateForSearchSpace).toHaveBeenCalledWith(1, 5, dto, "user-1");
		});

		it("POST pin should call pinQueryTemplate without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.pinQueryTemplate.mockResolvedValue({ pinned_query_template_ids: [1] });

			await controller.pinQueryTemplate(5, 1, req);

			expect(queryTemplatesService.pinQueryTemplate).toHaveBeenCalledWith(1, 5, "user-1");
		});

		it("POST unpin should call unpinQueryTemplate without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.unpinQueryTemplate.mockResolvedValue({ pinned_query_template_ids: [] });

			await controller.unpinQueryTemplate(5, 1, req);

			expect(queryTemplatesService.unpinQueryTemplate).toHaveBeenCalledWith(1, 5, "user-1");
		});
	});

	describe("Global routes", () => {
		it("POST admin should call createGlobal", async () => {
			const dto = { title: "Global", content: "Query" } as any;
			const req = { user: { id: "user-1" } } as any;
			queryTemplatesService.createGlobal.mockResolvedValue({ id: 1 });

			await controller.createGlobal(dto, req);

			expect(queryTemplatesService.createGlobal).toHaveBeenCalledWith(dto, "user-1");
		});
	});
});
