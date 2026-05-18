import {
	Controller,
	Get,
	Param,
	Query,
} from "@nestjs/common";
import { NotebooksService } from "../notebooks.service";
import {
	PublicNotebookDto,
	PublicNotebookListItemDto,
} from "../dtos/notebook.dto";

@Controller("public/notebooks")
export class PublicNotebooksController {
	constructor(private readonly notebooksService: NotebooksService) {}

	@Get()
	async findAll(
		@Query("search_space_id") searchSpaceId?: string,
	): Promise<PublicNotebookListItemDto[]> {
		const searchSpaceIdNum = searchSpaceId
			? parseInt(searchSpaceId, 10)
			: undefined;
		if (searchSpaceId && isNaN(searchSpaceIdNum!)) {
			return [];
		}
		return this.notebooksService.findPublishedNotebooks(searchSpaceIdNum);
	}

	@Get(":slug")
	async findOne(
		@Param("slug") slug: string,
	): Promise<PublicNotebookDto> {
		return this.notebooksService.findPublishedBySlug(slug);
	}
}
