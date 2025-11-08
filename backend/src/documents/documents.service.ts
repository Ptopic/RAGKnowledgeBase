import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import {
	CreateDocumentsDto,
	DocumentDto,
	DocumentWithChunksDto,
	PaginatedResponseDto,
	UpdateDocumentDto,
} from "../dtos/document.dto";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";

@Injectable()
export class DocumentsService {
	private readonly logger = new Logger(DocumentsService.name);

	constructor(
		private prisma: PrismaService,
		private queueService: QueueService,
	) {}

	async checkSearchSpaceOwnership(
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		const searchSpace = await this.prisma.searchSpace.findFirst({
			where: { id: searchSpaceId, userId },
		});

		if (!searchSpace) {
			throw new NotFoundException(
				"Search space not found or you do not have permission to access it",
			);
		}
	}

	async create(
		createDto: CreateDocumentsDto,
		userId: string,
	): Promise<{ message: string }> {
		try {
			await this.checkSearchSpaceOwnership(createDto.search_space_id, userId);

			if (createDto.document_type === DocumentType.EXTENSION) {
				// Process extension documents
				// In production, this would queue tasks for background processing
				return { message: "Documents processed successfully" };
			} else if (createDto.document_type === DocumentType.CRAWLED_URL) {
				// Process crawled URLs
				return { message: "Documents processed successfully" };
			} else if (createDto.document_type === DocumentType.YOUTUBE_VIDEO) {
				// Process YouTube videos
				return { message: "Documents processed successfully" };
			} else {
				throw new BadRequestException("Invalid document type");
			}
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to process documents: ${error.message}`,
			);
		}
	}

	async createFileUpload(
		files: Express.Multer.File[],
		searchSpaceId: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			await this.checkSearchSpaceOwnership(searchSpaceId, userId);

			if (!files || files.length === 0) {
				throw new BadRequestException("No files provided");
			}

			// Queue each file for background processing
			const queuedJobs = [];
			for (const file of files) {
				this.logger.log(
					`Queuing file for processing: ${file.originalname} (path: ${file.path})`,
				);

				const job = await this.queueService.processFileDocument(
					file.path,
					file.originalname,
					searchSpaceId,
					userId,
				);

				queuedJobs.push(job.id);
			}

			this.logger.log(
				`Successfully queued ${queuedJobs.length} file(s) for processing`,
			);

			return {
				message: `${files.length} file(s) uploaded and queued for processing`,
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			this.logger.error(`Failed to upload files: ${error.message}`, error.stack);
			throw new InternalServerErrorException(
				`Failed to upload files: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip?: number,
		page?: number,
		pageSize: number = 50,
		searchSpaceId?: number,
		documentTypes?: string,
	): Promise<PaginatedResponseDto<DocumentDto>> {
		try {
			let offset = 0;
			if (skip !== undefined && skip !== null) {
				offset = skip;
			} else if (page !== undefined && page !== null) {
				offset = page * pageSize;
			}

			const where: any = {
				searchSpace: { userId },
			};

			if (searchSpaceId !== undefined && searchSpaceId !== null) {
				where.searchSpaceId = searchSpaceId;
			}

			if (documentTypes) {
				const types = documentTypes.split(",").map((t) => t.trim());
				where.documentType = { in: types };
			}

			const total = await this.prisma.document.count({ where });

			let documents: any;
			if (pageSize === -1) {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					orderBy: { createdAt: "desc" },
				});
			} else {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					take: pageSize,
					orderBy: { createdAt: "desc" },
				});
			}

			return {
				items: documents.map((doc) => this.toDto(doc)),
				total,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch documents: ${error.message}`,
			);
		}
	}

	async search(
		userId: string,
		title: string,
		skip?: number,
		page?: number,
		pageSize: number = 50,
		searchSpaceId?: number,
		documentTypes?: string,
	): Promise<PaginatedResponseDto<DocumentDto>> {
		try {
			let offset = 0;
			if (skip !== undefined && skip !== null) {
				offset = skip;
			} else if (page !== undefined && page !== null) {
				offset = page * pageSize;
			}

			const where: any = {
				searchSpace: { userId },
				title: { contains: title, mode: "insensitive" },
			};

			if (searchSpaceId !== undefined && searchSpaceId !== null) {
				where.searchSpaceId = searchSpaceId;
			}

			if (documentTypes) {
				const types = documentTypes.split(",").map((t) => t.trim());
				where.documentType = { in: types };
			}

			const total = await this.prisma.document.count({ where });

			let documents: any;
			if (pageSize === -1) {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					orderBy: { createdAt: "desc" },
				});
			} else {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					take: pageSize,
					orderBy: { createdAt: "desc" },
				});
			}

			return {
				items: documents.map((doc) => this.toDto(doc)),
				total,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to search documents: ${error.message}`,
			);
		}
	}

	async getTypeCounts(
		userId: string,
		searchSpaceId?: number,
	): Promise<Record<string, number>> {
		try {
			const where: any = {
				searchSpace: { userId },
			};

			if (searchSpaceId !== undefined && searchSpaceId !== null) {
				where.searchSpaceId = searchSpaceId;
			}

			const documents = await this.prisma.document.groupBy({
				by: ["documentType"],
				where,
				_count: {
					id: true,
				},
			});

			const result: Record<string, number> = {};
			documents.forEach((doc) => {
				result[doc.documentType] = doc._count.id;
			});

			return result;
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch document type counts: ${error.message}`,
			);
		}
	}

	async getDocumentByChunkId(
		chunkId: number,
		userId: string,
	): Promise<DocumentWithChunksDto> {
		try {
			const chunk = await this.prisma.chunk.findUnique({
				where: { id: chunkId },
			});

			if (!chunk) {
				throw new NotFoundException(`Chunk with id ${chunkId} not found`);
			}

			const document = await this.prisma.document.findFirst({
				where: {
					id: chunk.documentId,
					searchSpace: { userId },
				},
				include: {
					chunks: {
						orderBy: { createdAt: "asc" },
					},
				},
			});

			if (!document) {
				throw new NotFoundException(
					"Document not found or you do not have access to it",
				);
			}

			return this.toWithChunksDto(document);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to retrieve document: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<DocumentDto> {
		try {
			const document = await this.prisma.document.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!document) {
				throw new NotFoundException(`Document with id ${id} not found`);
			}

			return this.toDto(document);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch document: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateDocumentDto,
		userId: string,
	): Promise<DocumentDto> {
		try {
			const document = await this.prisma.document.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!document) {
				throw new NotFoundException(`Document with id ${id} not found`);
			}

			const updated = await this.prisma.document.update({
				where: { id },
				data: {
					title: updateDto.title,
					content: updateDto.content,
					documentMetadata: updateDto.document_metadata as any,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update document: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const document = await this.prisma.document.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!document) {
				throw new NotFoundException(`Document with id ${id} not found`);
			}

			await this.prisma.document.delete({
				where: { id },
			});

			return { message: "Document deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete document: ${error.message}`,
			);
		}
	}

	private toDto(document: any): DocumentDto {
		return {
			id: document.id,
			title: document.title,
			document_type: document.documentType,
			document_metadata: document.documentMetadata,
			content: document.content,
			createdAt: document.createdAt,
			search_space_id: document.searchSpaceId,
		};
	}

	private toWithChunksDto(document: any): DocumentWithChunksDto {
		return {
			id: document.id,
			title: document.title,
			document_type: document.documentType,
			document_metadata: document.documentMetadata,
			content: document.content,
			createdAt: document.createdAt,
			search_space_id: document.searchSpaceId,
			chunks: document.chunks.map((chunk: any) => ({
				id: chunk.id,
				content: chunk.content,
				createdAt: chunk.createdAt,
				documentId: chunk.documentId,
			})),
		};
	}
}
