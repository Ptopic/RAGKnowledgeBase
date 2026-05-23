import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { LogsController } from "./logs.controller";
import { LogsService } from "./logs.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("LogsController", () => {
	let controller: LogsController;
	let logsService: any;

	beforeEach(async () => {
		logsService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			getLogsSummary: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LogsController],
			providers: [
				{ provide: LogsService, useValue: logsService },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<LogsController>(LogsController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("GET /logs", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			logsService.findAll.mockResolvedValue([]);

			await controller.findAll(req);

			expect(logsService.findAll).toHaveBeenCalledWith(
				"user-1", 0, 100, 5, undefined, undefined, undefined, undefined, undefined,
			);
		});
	});

	describe("GET /logs/:id", () => {
		it("should call service.findOne without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			logsService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(1, req);

			expect(logsService.findOne).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("POST /logs", () => {
		it("should call service.create without membership", async () => {
			const dto = { level: "INFO", message: "Test", search_space_id: 5 } as any;
			const req = { user: { id: "user-1" } } as any;
			logsService.create.mockResolvedValue({ id: 1 });

			await controller.create(dto, req);

			expect(logsService.create).toHaveBeenCalledWith(dto, "user-1");
		});
	});
});
