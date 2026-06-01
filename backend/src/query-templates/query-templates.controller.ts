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
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import {
	CreateQueryTemplateDto,
	PaginatedQueryTemplatesResponseDto,
	QueryTemplateDto,
	UpdateQueryTemplateDto,
} from "./dtos/query-template.dto";
import { QueryTemplatesService } from "./query-templates.service";

interface AuthenticatedRequest extends Request {
	user: { id: string };
}

@Controller()
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class QueryTemplatesController {
	constructor(private readonly queryTemplatesService: QueryTemplatesService) {}

	@Post("user/query-templates")
	async createGlobal(
		@Body() createDto: CreateQueryTemplateDto,
		@Req() req: AuthenticatedRequest,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.createGlobal(createDto, req.user.id);
	}

	@Get("user/query-templates")
	async findAllGlobal(
		@Req() req: AuthenticatedRequest,
		@Query("search") search?: string,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<PaginatedQueryTemplatesResponseDto> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.queryTemplatesService.findAllGlobal(req.user.id, search, skipNum, limitNum);
	}

	@Put("user/query-templates/:id")
	async updateGlobal(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateQueryTemplateDto,
		@Req() req: AuthenticatedRequest,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.updateGlobal(id, updateDto, req.user.id);
	}

	@Delete("user/query-templates/:id")
	async removeGlobal(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		return this.queryTemplatesService.removeGlobal(id, req.user.id);
	}

	@Post("searchspaces/:searchSpaceId/query-templates")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async createForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() createDto: CreateQueryTemplateDto,
		@Req() req: AuthenticatedRequest,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.createForSearchSpace(
			searchSpaceId,
			createDto,
			req.user.id,
		);
	}

	@Get("searchspaces/:searchSpaceId/query-templates")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAllForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: AuthenticatedRequest,
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
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async removeForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		return this.queryTemplatesService.removeForSearchSpace(
			id,
			searchSpaceId,
			req.user.id,
		);
	}

	@Put("searchspaces/:searchSpaceId/query-templates/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async updateForSearchSpace(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateQueryTemplateDto,
		@Req() req: AuthenticatedRequest,
	): Promise<QueryTemplateDto> {
		return this.queryTemplatesService.updateForSearchSpace(
			id,
			searchSpaceId,
			updateDto,
			req.user.id,
		);
	}

	@Post("searchspaces/:searchSpaceId/query-templates/:id/pin")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async pinQueryTemplate(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ pinned_query_template_ids: number[] }> {
		return this.queryTemplatesService.pinQueryTemplate(
			id,
			searchSpaceId,
			req.user.id,
		);
	}

	@Post("searchspaces/:searchSpaceId/query-templates/:id/unpin")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async unpinQueryTemplate(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("id", ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ pinned_query_template_ids: number[] }> {
		return this.queryTemplatesService.unpinQueryTemplate(
			id,
			searchSpaceId,
			req.user.id,
		);
	}
}
