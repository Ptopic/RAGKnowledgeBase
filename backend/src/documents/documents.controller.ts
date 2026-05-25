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
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { MemberRole } from "@prisma/client";
import * as fs from "fs";
import { diskStorage } from "multer";
import * as path from "path";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { DocumentsService } from "./documents.service";
import {
	CreateDocumentsDto,
	DocumentDto,
	DocumentWithChunksDto,
	FavoriteStatus,
	PaginatedResponseDto,
	UpdateDocumentDto,
	BulkDeleteDocumentsDto,
	BulkDeleteResultDto,
} from "./dtos/document.dto";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (_req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const ext = path.extname(file.originalname);
		const name = path.basename(file.originalname, ext);
		cb(null, `${name}-${uniqueSuffix}${ext}`);
	},
});

@Controller("documents")
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class DocumentsController {
	constructor(private readonly documentsService: DocumentsService) {}

	@Post()
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async create(
		@Body() createDto: CreateDocumentsDto,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.documentsService.create(createDto, req.user.id);
	}

	@Post("fileupload")
	@UseInterceptors(FilesInterceptor("files", 10, { storage }))
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async createFileUpload(
		@UploadedFiles() files: Express.Multer.File[],
		@Body("search_space_id", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.documentsService.createFileUpload(
			files,
			searchSpaceId,
			req.user.id,
		);
	}

	@Get()
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("page") page?: string,
		@Query("page_size") page_size?: string,
		@Query("document_types") document_types?: string,
		@Query("favorite_status") favorite_status?: FavoriteStatus,
	): Promise<PaginatedResponseDto<DocumentDto> & { favorite_ids: number[] }> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : undefined;
		const pageNum = page !== undefined ? parseInt(page, 10) : undefined;
		const pageSizeNum = page_size !== undefined ? parseInt(page_size, 10) : 50;

		return this.documentsService.findAll(
			req.user.id,
			req.searchSpaceContext.searchSpaceId,
			skipNum,
			pageNum,
			pageSizeNum,
			document_types,
			favorite_status,
		);
	}

	@Get("search")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async search(
		@Req() req: any,
		@Query("title") title: string,
		@Query("skip") skip?: string,
		@Query("page") page?: string,
		@Query("page_size") page_size?: string,
		@Query("document_types") document_types?: string,
		@Query("favorite_status") favorite_status?: FavoriteStatus,
	): Promise<PaginatedResponseDto<DocumentDto> & { favorite_ids: number[] }> {
		if (!title) {
			throw new BadRequestException("title query parameter is required");
		}

		const skipNum = skip !== undefined ? parseInt(skip, 10) : undefined;
		const pageNum = page !== undefined ? parseInt(page, 10) : undefined;
		const pageSizeNum = page_size !== undefined ? parseInt(page_size, 10) : 50;

		return this.documentsService.search(
			req.user.id,
			req.searchSpaceContext.searchSpaceId,
			title,
			skipNum,
			pageNum,
			pageSizeNum,
			document_types,
			favorite_status,
		);
	}

	@Get("type-counts")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async getTypeCounts(
		@Req() req: any,
	): Promise<Record<string, number>> {
		return this.documentsService.getTypeCounts(
			req.user.id,
			req.searchSpaceContext.searchSpaceId,
		);
	}

	@Get("by-chunk/:chunkId")
	async getDocumentByChunkId(
		@Param("chunkId", ParseIntPipe) chunkId: number,
		@Req() req: any,
	): Promise<DocumentWithChunksDto> {
		return this.documentsService.getDocumentByChunkId(chunkId, req.user.id);
	}

	@Get(":id/chunks")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOneWithChunks(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<DocumentWithChunksDto> {
		return this.documentsService.findOneWithChunks(id, req.user.id);
	}

	@Get(":id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<DocumentDto> {
		return this.documentsService.findOne(id, req.user.id);
	}

	@Put(":id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateDocumentDto,
		@Req() req: any,
	): Promise<DocumentDto> {
		return this.documentsService.update(id, updateDto, req.user.id);
	}

	@Delete("bulk")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async bulkRemove(
		@Body() bulkDeleteDto: BulkDeleteDocumentsDto,
		@Req() req: any,
	): Promise<BulkDeleteResultDto> {
		return this.documentsService.bulkRemove(
			bulkDeleteDto.ids,
			req.searchSpaceContext.searchSpaceId,
			req.user.id,
		);
	}

	@Delete(":id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.documentsService.remove(id, req.user.id);
	}

	@Post(":id/favorite")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async addFavorite(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.documentsService.addFavorite(id, req.user.id);
	}

	@Delete(":id/favorite")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async removeFavorite(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.documentsService.removeFavorite(id, req.user.id);
	}
}
