import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { SseService } from "../sse/sse.service";
import { estimatePagesFromFilePath } from "../subscription/page-estimate";
import { SubscriptionService } from "../subscription/subscription.service";
import {
	BulkDeleteResultDto,
	CreateDocumentsDto,
	DocumentDto,
	DocumentWithChunksDto,
	FavoriteStatus,
	PaginatedResponseDto,
	UpdateDocumentDto,
} from "./dtos/document.dto";

@Injectable()
export class DocumentsService {
	private readonly logger = new Logger(DocumentsService.name);

	constructor(
		private prisma: PrismaService,
		private queueService: QueueService,
		private sseService: SseService,
		private subscriptionService: SubscriptionService,
	) {}

	async create(
		createDto: CreateDocumentsDto,
		userId: string,
	): Promise<{ message: string }> {
		try {
			if (!createDto.content || createDto.content.length === 0) {
				throw new BadRequestException("Content array cannot be empty");
			}

			// Superusers (admins) are exempt from credit charges.
			const bypassCredits =
				await this.subscriptionService.isSuperuserBypass(userId);

			// Pre-flight: charge 1 INDEX_PAGE credit per item. URL crawl and
			// YouTube transcript lengths are unknown at queue time; we use
			// the simple 1-credit heuristic. TODO: reconcile the actual
			// indexed page count in the url-crawler / youtube-processor
			// hooks (mirroring the file-processor reconciliation pattern).
			const itemCount = createDto.content.length;
			if (itemCount > 0 && !bypassCredits) {
				await this.subscriptionService.checkCredits(userId, itemCount);
			}

			if (createDto.document_type === DocumentType.CRAWLED_URL) {
				const queuedJobs = [];
				for (const url of createDto.content) {
					this.logger.log(
						`Creating placeholder and queuing URL for crawling: ${url}`,
					);

					const placeholderDoc = await this.prisma.document.create({
						data: {
							searchSpaceId: createDto.search_space_id,
							title: url,
							documentType: DocumentType.CRAWLED_URL,
							documentMetadata: { url, source: "url_crawl" },
							content: null,
							contentHash: null,
							processingStatus: "PROCESSING",
							processingStartedAt: new Date(),
						},
					});

					this.sseService.broadcastEvent({
						topic: "documents",
						data: {
							action: "create",
							searchSpaceId: createDto.search_space_id,
							documentId: placeholderDoc.id,
						},
					});

					try {
						const job = await this.queueService.processUrlDocument(
							url,
							createDto.search_space_id,
							userId,
							placeholderDoc.id,
						);
						queuedJobs.push(job.id);
					} catch (queueError) {
						await this.prisma.document.update({
							where: { id: placeholderDoc.id },
							data: {
								processingStatus: "FAILED",
								processingCompletedAt: new Date(),
							},
						});
						this.sseService.broadcastEvent({
							topic: "documents",
							data: {
								action: "update",
								searchSpaceId: createDto.search_space_id,
								documentId: placeholderDoc.id,
							},
						});
						this.logger.error(
							`Failed to queue URL ${url}: ${queueError.message}`,
							queueError.stack,
						);
					}
				}

				if (!bypassCredits) {
					await this.deductForUrlOrYouTubeBatch(
						userId,
						createDto.search_space_id,
						itemCount,
					);
				}

				this.logger.log(
					`Successfully queued ${queuedJobs.length} URL(s) for crawling`,
				);

				return {
					message: `${createDto.content.length} URL(s) queued for processing`,
				};
			}
			if (createDto.document_type === DocumentType.YOUTUBE_VIDEO) {
				const queuedJobs = [];
				for (const videoUrl of createDto.content) {
					this.logger.log(
						`Creating placeholder and queuing YouTube video: ${videoUrl}`,
					);

					const placeholderDoc = await this.prisma.document.create({
						data: {
							searchSpaceId: createDto.search_space_id,
							title: videoUrl,
							documentType: DocumentType.YOUTUBE_VIDEO,
							documentMetadata: { url: videoUrl, source: "youtube_import" },
							content: null,
							contentHash: null,
							processingStatus: "PROCESSING",
							processingStartedAt: new Date(),
						},
					});

					this.sseService.broadcastEvent({
						topic: "documents",
						data: {
							action: "create",
							searchSpaceId: createDto.search_space_id,
							documentId: placeholderDoc.id,
						},
					});

					try {
						const job = await this.queueService.processYouTubeDocument(
							videoUrl,
							createDto.search_space_id,
							userId,
							placeholderDoc.id,
						);
						queuedJobs.push(job.id);
					} catch (queueError) {
						await this.prisma.document.update({
							where: { id: placeholderDoc.id },
							data: {
								processingStatus: "FAILED",
								processingCompletedAt: new Date(),
							},
						});
						this.sseService.broadcastEvent({
							topic: "documents",
							data: {
								action: "update",
								searchSpaceId: createDto.search_space_id,
								documentId: placeholderDoc.id,
							},
						});
						this.logger.error(
							`Failed to queue YouTube video ${videoUrl}: ${queueError.message}`,
							queueError.stack,
						);
					}
				}

				if (!bypassCredits) {
					await this.deductForUrlOrYouTubeBatch(
						userId,
						createDto.search_space_id,
						itemCount,
					);
				}

				this.logger.log(
					`Successfully queued ${queuedJobs.length} YouTube video(s) for processing`,
				);

				return {
					message: `${createDto.content.length} YouTube video(s) queued for processing`,
				};
			}
			throw new BadRequestException("Invalid document type");
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			this.logger.error(
				`Failed to process documents: ${error.message}`,
				error.stack,
			);
			throw new InternalServerErrorException(
				`Failed to process documents: ${error.message}`,
			);
		}
	}

	/**
	 * Deduct INDEX_PAGE credits for a URL crawl or YouTube batch.
	 * One credit per item, same model as the file-upload path. Failures
	 * are logged but don't fail the request — the items are already
	 * queued and the user has been pre-checked.
	 */
	private async deductForUrlOrYouTubeBatch(
		userId: string,
		searchSpaceId: number,
		itemCount: number,
	): Promise<void> {
		if (itemCount <= 0) return;
		try {
			await this.subscriptionService.deductForIndexedPages(
				userId,
				searchSpaceId,
				itemCount,
			);
		} catch (err) {
			this.logger.error(
				`Failed to deduct URL/YouTube credits (user=${userId}, count=${itemCount}): ${(err as Error).message}`,
			);
		}
	}

	async createFileUpload(
		files: Express.Multer.File[],
		searchSpaceId: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			if (!files || files.length === 0) {
				throw new BadRequestException("No files provided");
			}

			// Pre-flight: estimate page count per file. We pre-deduct the
			// total up front; the document processor reconciles each file's
			// actual page count after docling/llamacloud completes and
			// refunds (or charges) the difference per file.
			const perFileEstimates: number[] = files.map((file) => {
				try {
					return estimatePagesFromFilePath(file.path);
				} catch {
					return 1;
				}
			});
			const totalEstimated = perFileEstimates.reduce((s, n) => s + n, 0);

			// Superusers (admins) are exempt from credit charges.
			const bypassCredits =
				await this.subscriptionService.isSuperuserBypass(userId);

			// Deduct BEFORE creating placeholder docs / queueing jobs.
			// If a concurrent request pushed the user over the limit
			// between the pre-check and now, `deductForIndexedPages`
			// throws (atomic updateMany with a credit-limit guard) and
			// we surface a 402 — the user never gets free indexed files.
			if (totalEstimated > 0 && !bypassCredits) {
				await this.subscriptionService.deductForIndexedPages(
					userId,
					searchSpaceId,
					totalEstimated,
				);
			}

			const queuedJobs = [];
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const fileEstimated = perFileEstimates[i];
				this.logger.log(
					`Creating placeholder and queuing file: ${file.originalname} (estimated ${fileEstimated} pages)`,
				);

				const placeholderDoc = await this.prisma.document.create({
					data: {
						searchSpaceId,
						title: file.originalname,
						documentType: DocumentType.FILE,
						documentMetadata: {
							file_name: file.originalname,
							source: "file_upload",
						},
						content: null,
						contentHash: null,
						processingStatus: "PROCESSING",
						processingStartedAt: new Date(),
					},
				});

				this.sseService.broadcastEvent({
					topic: "documents",
					data: {
						action: "create",
						searchSpaceId,
						documentId: placeholderDoc.id,
					},
				});

				try {
					const job = await this.queueService.processFileDocument(
						file.path,
						file.originalname,
						searchSpaceId,
						userId,
						placeholderDoc.id,
						fileEstimated,
					);
					queuedJobs.push(job.id);
				} catch (queueError) {
					await this.prisma.document.update({
						where: { id: placeholderDoc.id },
						data: {
							processingStatus: "FAILED",
							processingCompletedAt: new Date(),
						},
					});
					this.sseService.broadcastEvent({
						topic: "documents",
						data: {
							action: "update",
							searchSpaceId,
							documentId: placeholderDoc.id,
						},
					});
					this.logger.error(
						`Failed to queue file ${file.originalname}: ${queueError.message}`,
						queueError.stack,
					);
				}
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
			this.logger.error(
				`Failed to upload files: ${error.message}`,
				error.stack,
			);
			throw new InternalServerErrorException(
				`Failed to upload files: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		searchSpaceId: number,
		skip?: number,
		page?: number,
		pageSize: number = 50,
		documentTypes?: string,
		favoriteStatus?: FavoriteStatus,
	): Promise<PaginatedResponseDto<DocumentDto> & { favorite_ids: number[] }> {
		try {
			let offset = 0;
			if (skip !== undefined && skip !== null) {
				offset = skip;
			} else if (page !== undefined && page !== null) {
				offset = page * pageSize;
			}

			const where: any = {
				searchSpaceId,
			};

			if (documentTypes) {
				const types = documentTypes.split(",").map((t) => t.trim());
				where.documentType = { in: types };
			}

			if (favoriteStatus === FavoriteStatus.FAVORITED) {
				where.favoritedBy = {
					some: { userId },
				};
			} else if (favoriteStatus === FavoriteStatus.NON_FAVORITED) {
				where.favoritedBy = {
					none: { userId },
				};
			}

			const total = await this.prisma.document.count({ where });

			let documents: any;
			if (pageSize === -1) {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					orderBy: { createdAt: "desc" },
					include: { _count: { select: { chunks: true } } },
				});
			} else {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					take: pageSize,
					orderBy: { createdAt: "desc" },
					include: { _count: { select: { chunks: true } } },
				});
			}

			const favoriteWhere: any = { userId };
			favoriteWhere.document = { searchSpaceId };
			const favoriteRecords = await this.prisma.userDocumentFavorite.findMany({
				where: favoriteWhere,
				select: { documentId: true },
			});

			return {
				items: documents.map((doc) => this.toDto(doc)),
				total,
				favorite_ids: favoriteRecords.map((f) => f.documentId),
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch documents: ${error.message}`,
			);
		}
	}

	async search(
		userId: string,
		searchSpaceId: number,
		title: string,
		skip?: number,
		page?: number,
		pageSize: number = 50,
		documentTypes?: string,
		favoriteStatus?: FavoriteStatus,
	): Promise<PaginatedResponseDto<DocumentDto> & { favorite_ids: number[] }> {
		try {
			let offset = 0;
			if (skip !== undefined && skip !== null) {
				offset = skip;
			} else if (page !== undefined && page !== null) {
				offset = page * pageSize;
			}

			const where: any = {
				searchSpaceId,
				title: { contains: title, mode: "insensitive" },
			};

			if (documentTypes) {
				const types = documentTypes.split(",").map((t) => t.trim());
				where.documentType = { in: types };
			}

			if (favoriteStatus === FavoriteStatus.FAVORITED) {
				where.favoritedBy = {
					some: { userId },
				};
			} else if (favoriteStatus === FavoriteStatus.NON_FAVORITED) {
				where.favoritedBy = {
					none: { userId },
				};
			}

			const total = await this.prisma.document.count({ where });

			let documents: any;
			if (pageSize === -1) {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					orderBy: { createdAt: "desc" },
					include: { _count: { select: { chunks: true } } },
				});
			} else {
				documents = await this.prisma.document.findMany({
					where,
					skip: offset,
					take: pageSize,
					orderBy: { createdAt: "desc" },
					include: { _count: { select: { chunks: true } } },
				});
			}

			const favoriteWhere: any = { userId };
			favoriteWhere.document = { searchSpaceId };
			const favoriteRecords = await this.prisma.userDocumentFavorite.findMany({
				where: favoriteWhere,
				select: { documentId: true },
			});

			return {
				items: documents.map((doc) => this.toDto(doc)),
				total,
				favorite_ids: favoriteRecords.map((f) => f.documentId),
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to search documents: ${error.message}`,
			);
		}
	}

	async getTypeCounts(
		userId: string,
		searchSpaceId: number,
	): Promise<Record<string, number>> {
		try {
			const where: any = {
				searchSpaceId,
			};

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
				where: { id },
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

	async findOneWithChunks(
		id: number,
		userId: string,
	): Promise<DocumentWithChunksDto> {
		try {
			const document = await this.prisma.document.findFirst({
				where: { id },
				include: {
					chunks: {
						orderBy: { createdAt: "asc" },
					},
				},
			});

			if (!document) {
				throw new NotFoundException(`Document with id ${id} not found`);
			}

			return this.toWithChunksDto(document);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch document with chunks: ${error.message}`,
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
				where: { id },
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
				where: { id },
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

	async bulkRemove(
		ids: number[],
		searchSpaceId: number,
		userId: string,
	): Promise<BulkDeleteResultDto> {
		try {
			const existingDocs = await this.prisma.document.findMany({
				where: {
					id: { in: ids },
					searchSpaceId,
				},
				select: { id: true },
			});

			const existingIds = new Set(existingDocs.map((d) => d.id));
			const deleted: number[] = [];
			const failed: Array<{ id: number; reason: string }> = [];

			for (const id of ids) {
				if (!existingIds.has(id)) {
					failed.push({ id, reason: "Not found" });
				}
			}

			if (existingDocs.length > 0) {
				await this.prisma.document.deleteMany({
					where: {
						id: { in: Array.from(existingIds) },
						searchSpaceId,
					},
				});
				deleted.push(...Array.from(existingIds));
			}

			this.logger.log(
				`Bulk delete completed: ${deleted.length} deleted, ${failed.length} failed`,
			);

			return {
				deleted,
				failed,
				message: `Bulk delete completed: ${deleted.length} deleted, ${failed.length} failed`,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to bulk delete documents: ${error.message}`,
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
			created_at: document.createdAt,
			search_space_id: document.searchSpaceId,
			chunks_count: document?._count?.chunks ?? 0,
			processing_status: document.processingStatus,
			processing_started_at: document.processingStartedAt,
			processing_completed_at: document.processingCompletedAt,
		};
	}

	private toWithChunksDto(document: any): DocumentWithChunksDto {
		return {
			id: document.id,
			title: document.title,
			document_type: document.documentType,
			document_metadata: document.documentMetadata,
			content: document.content,
			created_at: document.createdAt,
			search_space_id: document.searchSpaceId,
			chunks: document.chunks.map((chunk: any) => ({
				id: chunk.id,
				content: chunk.content,
				created_at: chunk.createdAt,
				document_id: chunk.documentId,
			})),
			processing_status: document.processingStatus,
			processing_started_at: document.processingStartedAt,
			processing_completed_at: document.processingCompletedAt,
		};
	}

	async addFavorite(id: number, userId: string): Promise<{ message: string }> {
		try {
			const document = await this.prisma.document.findFirst({
				where: { id },
			});

			if (!document) {
				throw new NotFoundException(`Document with id ${id} not found`);
			}

			await this.prisma.userDocumentFavorite.upsert({
				where: {
					userId_documentId: {
						userId,
						documentId: id,
					},
				},
				create: {
					userId,
					documentId: id,
				},
				update: {},
			});

			return { message: "Document added to favorites" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to add favorite: ${error.message}`,
			);
		}
	}

	async removeFavorite(
		id: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			const document = await this.prisma.document.findFirst({
				where: { id },
			});

			if (!document) {
				throw new NotFoundException(
					`Document with id ${id} not found or you do not have access to it`,
				);
			}

			await this.prisma.userDocumentFavorite.delete({
				where: {
					userId_documentId: {
						userId,
						documentId: id,
					},
				},
			});

			return { message: "Document removed from favorites" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			if (error.code === "P2025") {
				throw new NotFoundException(`Document is not in your favorites`);
			}
			throw new InternalServerErrorException(
				`Failed to remove favorite: ${error.message}`,
			);
		}
	}
}
