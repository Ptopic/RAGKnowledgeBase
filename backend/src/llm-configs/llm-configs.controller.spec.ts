import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { LLMConfigsController } from "./llm-configs.controller";
import { LLMConfigsService } from "./llm-configs.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";

describe("LLMConfigsController", () => {
	let controller: LLMConfigsController;
	let llmConfigsService: any;

	beforeEach(async () => {
		llmConfigsService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			getUserLLMPreferences: jest.fn(),
			updateUserLLMPreferences: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [LLMConfigsController],
			providers: [
				{ provide: LLMConfigsService, useValue: llmConfigsService },
				{ provide: PermissionsService, useValue: { getMembership: jest.fn() } },
				{ provide: SearchSpaceAccessGuard, useValue: { canActivate: jest.fn().mockResolvedValue(true) } },
			],
		}).compile();

		controller = module.get<LLMConfigsController>(LLMConfigsController);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("GET /llm-configs", () => {
		it("should pass searchSpaceId from req.searchSpaceContext to service.findAll", async () => {
			const req = {
				user: { id: "user-1" },
				searchSpaceContext: { searchSpaceId: 5 },
			} as any;
			llmConfigsService.findAll.mockResolvedValue([]);

			await controller.findAll(req);

			expect(llmConfigsService.findAll).toHaveBeenCalledWith(5, "user-1", 0, 200);
		});
	});

	describe("GET /llm-configs/:id", () => {
		it("should call service.findOne without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			llmConfigsService.findOne.mockResolvedValue({ id: 1 });

			await controller.findOne(1, req);

			expect(llmConfigsService.findOne).toHaveBeenCalledWith(1, "user-1");
		});
	});

	describe("POST /llm-configs", () => {
		it("should call service.create without membership", async () => {
			const dto = { name: "GPT-4", search_space_id: 5 } as any;
			const req = { user: { id: "user-1" } } as any;
			llmConfigsService.create.mockResolvedValue({ id: 1 });

			await controller.create(dto, req);

			expect(llmConfigsService.create).toHaveBeenCalledWith(dto, "user-1");
		});
	});

	describe("PUT /llm-configs/:id", () => {
		it("should call service.update without membership", async () => {
			const dto = { name: "Updated" } as any;
			const req = { user: { id: "user-1" } } as any;
			llmConfigsService.update.mockResolvedValue({ id: 1 });

			await controller.update(1, dto, req);

			expect(llmConfigsService.update).toHaveBeenCalledWith(1, dto, "user-1");
		});
	});

	describe("DELETE /llm-configs/:id", () => {
		it("should call service.remove without membership", async () => {
			const req = { user: { id: "user-1" } } as any;
			llmConfigsService.remove.mockResolvedValue({ message: "Deleted" });

			await controller.remove(1, req);

			expect(llmConfigsService.remove).toHaveBeenCalledWith(1, "user-1");
		});
	});
});
