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
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import {
	CreateQueryTemplateDto,
	PaginatedQueryTemplatesResponseDto,
	QueryTemplateDto,
	UpdateQueryTemplateDto,
} from "./dtos/query-template.dto";
import { QueryTemplatesService } from "./query-templates.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class QueryTemplatesController {
	constructor(private readonly queryTemplatesService: QueryTemplatesService) {}

	@Post("admin/query-templates")
	async createGlobal(
		@Body() createDto: CreateQueryTemplateDto,
		@Req() req: any,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.createGlobal(createDto, req.user.id);
	}

	@Get("admin/query-templates")
	async findAllGlobal(
		@Query("search") search?: string,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<PaginatedQueryTemplatesResponseDto> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.queryTemplatesService.findAllGlobal(search, skipNum, limitNum);
	}

	@Put("admin/query-templates/:id")
	async updateGlobal(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateQueryTemplateDto,
		@Req() req: any,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.updateGlobal(id, updateDto, req.user.id);
	}

	@Delete("admin/query-templates/:id")
	async removeGlobal(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.queryTemplatesService.removeGlobal(id, req.user.id);
	}

	@Post("searchspaces/:searchSpaceId/query-templates")
	async createForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() createDto: CreateQueryTemplateDto,
		@Req() req: any,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.createForSearchSpace(
			searchSpaceId,
			createDto,
			req.user.id,
		);
	}

	@Get("searchspaces/:searchSpaceId/query-templates")
	async findAllForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
		@Query("search") search?: string,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<PaginatedQueryTemplatesResponseDto> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.queryTemplatesService.findAllForSearchSpace(
			searchSpaceId,
			req.user.id,
			search,
			skipNum,
			limitNum,
		);
	}

	@Delete("searchspaces/:searchSpaceId/query-templates/:id")
	async removeForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.queryTemplatesService.removeForSearchSpace(
			id,
			searchSpaceId,
			req.user.id,
		);
	}

	@Put("searchspaces/:searchSpaceId/query-templates/:id")
	async updateForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateQueryTemplateDto,
		@Req() req: any,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.updateForSearchSpace(
			id,
			searchSpaceId,
			updateDto,
			req.user.id,
		);
	}

	@Post("searchspaces/:searchSpaceId/query-templates/:id/pin")
	async pinQueryTemplate(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ pinned_query_template_ids: number[] }> {
		return this.queryTemplatesService.pinQueryTemplate(
			id,
			searchSpaceId,
			req.user.id,
		);
	}

	@Post("searchspaces/:searchSpaceId/query-templates/:id/unpin")
	async unpinQueryTemplate(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ pinned_query_template_ids: number[] }> {
		return this.queryTemplatesService.unpinQueryTemplate(
			id,
			searchSpaceId,
			req.user.id,
		);
	}
}
