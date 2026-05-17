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
import { NotebooksService } from "./notebooks.service";
import {
	NotebookDto,
	NotebookListItemDto,
	CreateNotebookDto,
	UpdateNotebookDto,
} from "./dtos/notebook.dto";

@Controller("searchspaces")
@UseGuards(JwtAuthGuard)
export class NotebooksController {
	constructor(private readonly notebooksService: NotebooksService) {}

	@Post(":searchSpaceId/notebooks")
	async create(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() createDto: CreateNotebookDto,
		@Req() req: any,
	): Promise<NotebookDto> {
		createDto.search_space_id = searchSpaceId;
		return this.notebooksService.create(createDto, req.user.id);
	}

	@Get(":searchSpaceId/notebooks")
	async findAll(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<NotebookListItemDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.notebooksService.findAll(
			req.user.id,
			searchSpaceId,
			skipNum,
			limitNum,
		);
	}

	@Get(":searchSpaceId/notebooks/:notebookId")
	async findOne(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Req() req: any,
	): Promise<NotebookDto> {
		return this.notebooksService.findOne(notebookId, req.user.id);
	}

	@Put(":searchSpaceId/notebooks/:notebookId")
	async update(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Body() updateDto: UpdateNotebookDto,
		@Req() req: any,
	): Promise<NotebookDto> {
		return this.notebooksService.update(notebookId, updateDto, req.user.id);
	}

	@Delete(":searchSpaceId/notebooks/:notebookId")
	async remove(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.notebooksService.remove(notebookId, req.user.id);
	}
}
