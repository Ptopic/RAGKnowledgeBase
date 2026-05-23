import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { MemberRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import {
	CreateLLMConfigDto,
	LLMConfigDto,
	LLMPreferencesDto,
	LLMPreferencesUpdateDto,
	UpdateLLMConfigDto,
} from "./dtos/llm-config.dto";
import { LLMConfigsService } from "./llm-configs.service";

@Controller()
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class LLMConfigsController {
	constructor(private readonly llmConfigsService: LLMConfigsService) {}

	@Post("llm-configs")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async create(
		@Body() createDto: CreateLLMConfigDto,
		@Req() req: any,
	): Promise<LLMConfigDto> {
		return this.llmConfigsService.create(createDto, req.user.id);
	}

	@Get("llm-configs")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<LLMConfigDto[]> {
		const searchSpaceIdNum = req.searchSpaceContext.searchSpaceId;
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 200;
		return this.llmConfigsService.findAll(
			searchSpaceIdNum,
			req.user.id,
			skipNum,
			limitNum,
		);
	}

	@Get("llm-configs/:id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<LLMConfigDto> {
		return this.llmConfigsService.findOne(id, req.user.id);
	}

	@Put("llm-configs/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateLLMConfigDto,
		@Req() req: any,
	): Promise<LLMConfigDto> {
		return this.llmConfigsService.update(id, updateDto, req.user.id);
	}

	@Delete("llm-configs/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.llmConfigsService.remove(id, req.user.id);
	}

	@Get("search-spaces/:searchSpaceId/llm-preferences")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async getUserLLMPreferences(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
	): Promise<LLMPreferencesDto> {
		return this.llmConfigsService.getUserLLMPreferences(
			searchSpaceId,
			req.user.id,
		);
	}

	@Put("search-spaces/:searchSpaceId/llm-preferences")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async updateUserLLMPreferences(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() preferencesDto: LLMPreferencesUpdateDto,
		@Req() req: any,
	): Promise<LLMPreferencesDto> {
		return this.llmConfigsService.updateUserLLMPreferences(
			searchSpaceId,
			preferencesDto,
			req.user.id,
		);
	}
}
