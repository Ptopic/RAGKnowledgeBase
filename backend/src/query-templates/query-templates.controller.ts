import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Req,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import {
	CreateQueryTemplateDto,
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
	async findAllGlobal(): Promise<QueryTemplateDto[]> {
		return this.queryTemplatesService.findAllGlobal();
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
	): Promise<QueryTemplateDto[]> {
		return this.queryTemplatesService.findAllForSearchSpace(
			searchSpaceId,
			req.user.id,
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
}
