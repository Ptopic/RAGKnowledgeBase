import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Query,
} from "@nestjs/common";
import { NotebooksService } from "../notebooks.service";
import {
	PaginatedPublicNotebooksResponseDto,
	PublicNotebookDto,
} from "../dtos/notebook.dto";

@Controller("public/notebooks")
export class PublicNotebooksController {
	constructor(private readonly notebooksService: NotebooksService) {}

	@Get()
	async findAll(
		@Query("search_space_id") searchSpaceId?: string,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("q") q?: string,
		@Query("sortBy") sortBy?: string,
		@Query("sortOrder") sortOrder?: string,
	): Promise<PaginatedPublicNotebooksResponseDto> {
		const searchSpaceIdNum = searchSpaceId
			? parseInt(searchSpaceId, 10)
			: undefined;
		if (searchSpaceId && isNaN(searchSpaceIdNum!)) {
			return { items: [], total: 0 };
		}

		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;

		if (isNaN(skipNum) || skipNum < 0) {
			throw new BadRequestException("skip must be a non-negative integer");
		}
		if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
			throw new BadRequestException("limit must be between 1 and 1000");
		}

		if (q !== undefined && q.length > 200) {
			throw new BadRequestException("Search query must be 200 characters or less");
		}

		if (sortBy !== undefined && sortBy !== "published_at") {
			throw new BadRequestException("sortBy must be 'published_at'");
		}
		if (
			sortOrder !== undefined &&
			sortOrder !== "asc" &&
			sortOrder !== "desc"
		) {
			throw new BadRequestException("sortOrder must be 'asc' or 'desc'");
		}

		return this.notebooksService.findPublishedNotebooks(
			searchSpaceIdNum,
			skipNum,
			limitNum,
			q,
			sortBy,
			sortOrder,
		);
	}

	@Get(":slug")
	async findOne(
		@Param("slug") slug: string,
	): Promise<PublicNotebookDto> {
		return this.notebooksService.findPublishedBySlug(slug);
	}
}
