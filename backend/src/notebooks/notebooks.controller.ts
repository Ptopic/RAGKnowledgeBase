import {
	BadRequestException,
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
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { UploadService } from "../upload";
import { NotebooksService } from "./notebooks.service";
import {
	NotebookDto,
	NotebookListItemDto,
	CreateNotebookDto,
	UpdateNotebookDto,
} from "./dtos/notebook.dto";

interface AuthenticatedRequest extends Request {
	user: { id: string };
}

@Controller("searchspaces")
@UseGuards(JwtAuthGuard)
export class NotebooksController {
	constructor(
		private readonly notebooksService: NotebooksService,
		private readonly uploadService: UploadService,
	) {}

	@Post(":searchSpaceId/notebooks")
	async create(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() createDto: CreateNotebookDto,
		@Req() req: AuthenticatedRequest,
	): Promise<NotebookDto> {
		return this.notebooksService.create({ ...createDto, search_space_id: searchSpaceId }, req.user.id);
	}

	@Post(":searchSpaceId/notebooks/upload-image")
	@UseInterceptors(FileInterceptor("file", {
		limits: { fileSize: 5 * 1024 * 1024 },
	}))
	async uploadImage(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@UploadedFile() file: Express.Multer.File,
		@Req() req: AuthenticatedRequest,
	): Promise<{ url: string }> {
		if (!file) {
			throw new BadRequestException("No file uploaded");
		}
		if (!file.mimetype.startsWith("image/")) {
			throw new BadRequestException("Only image files are allowed");
		}
		await this.notebooksService.checkSearchSpaceOwnership(searchSpaceId, req.user.id);

		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const ext = file.originalname.split(".").pop() || "png";
		const filename = `notebook-${uniqueSuffix}.${ext}`;
		const result = await this.uploadService.upload(file.buffer, filename, "notebooks", file.mimetype);
		return { url: result.url };
	}

	@Delete(":searchSpaceId/notebooks/delete-image")
	async deleteImage(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() body: { url: string },
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		await this.notebooksService.checkSearchSpaceOwnership(searchSpaceId, req.user.id);
		await this.uploadService.delete(body.url);
		return { message: "Image deleted" };
	}

	@Get(":searchSpaceId/notebooks")
	async findAll(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: AuthenticatedRequest,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<NotebookListItemDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		if (isNaN(skipNum)) throw new BadRequestException("skip must be an integer");
		if (isNaN(limitNum)) throw new BadRequestException("limit must be an integer");
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
		@Req() req: AuthenticatedRequest,
	): Promise<NotebookDto> {
		return this.notebooksService.findOne(notebookId, searchSpaceId, req.user.id);
	}

	@Put(":searchSpaceId/notebooks/:notebookId")
	async update(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Body() updateDto: UpdateNotebookDto,
		@Req() req: AuthenticatedRequest,
	): Promise<NotebookDto> {
		return this.notebooksService.update(notebookId, searchSpaceId, updateDto, req.user.id);
	}

	@Delete(":searchSpaceId/notebooks/:notebookId")
	async remove(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		return this.notebooksService.remove(notebookId, searchSpaceId, req.user.id);
	}

	@Post(":searchSpaceId/notebooks/:notebookId/publish")
	async publish(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<NotebookDto> {
		return this.notebooksService.publish(notebookId, searchSpaceId, req.user.id);
	}

	@Post(":searchSpaceId/notebooks/:notebookId/unpublish")
	async unpublish(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("notebookId", ParseIntPipe) notebookId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<NotebookDto> {
		return this.notebooksService.unpublish(notebookId, searchSpaceId, req.user.id);
	}
}
