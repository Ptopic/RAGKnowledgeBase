import * as crypto from "node:crypto";
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { DocumentType, Notebook as PrismaNotebook } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { EmbeddingService } from "../retriever/embedding.service";
import { ImageAnalysisService } from "../services/image-analysis.service";
import { UploadService } from "../upload";
import {
	chunkMarkdownContent,
	createMarkdownAwareSplitter,
} from "../utils/chunking";
import { ImageCandidate } from "../utils/image-markdown";
import { notebookHtmlToMarkdown } from "../utils/notebook-html-to-markdown";
import {
	CreateNotebookDto,
	NotebookDto,
	NotebookListItemDto,
	PaginatedNotebooksResponseDto,
	PublicNotebookDto,
	PublicNotebookListItemDto,
	UpdateNotebookDto,
} from "./dtos/notebook.dto";

@Injectable()
export class NotebooksService {
	private readonly logger = new Logger(NotebooksService.name);
	private readonly textSplitter = createMarkdownAwareSplitter();

	constructor(
		private prisma: PrismaService,
		private uploadService: UploadService,
		private embeddingService: EmbeddingService,
		private imageAnalysisService: ImageAnalysisService,
		private permissionsService: PermissionsService,
	) {}

	private async generateSlug(title: string, attempt = 0): Promise<string> {
		if (attempt > 10)
			throw new InternalServerErrorException("Failed to generate unique slug");

		const base =
			title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")
				.slice(0, 80) || "notebook";
		const suffix = Math.random().toString(36).slice(2, 8);
		const slug = `${base}-${suffix}`;
		const existing = await this.prisma.notebook.findUnique({ where: { slug } });
		if (existing) return this.generateSlug(title, attempt + 1);
		return slug;
	}

	async create(
		createDto: CreateNotebookDto,
		userId: string,
	): Promise<NotebookDto> {
		try {
			await this.permissionsService.requireWrite(createDto.search_space_id, userId);

			if (
				createDto.headline_image_url &&
				!this.uploadService.isOwnedUrl(createDto.headline_image_url)
			) {
				throw new BadRequestException(
					"headline_image_url must point to application-managed storage",
				);
			}

			const slug = await this.generateSlug(createDto.title);

			const notebook = await this.prisma.notebook.create({
				data: {
					title: createDto.title,
					slug,
					content: createDto.content,
					excerpt: createDto.excerpt,
					headlineImageUrl: createDto.headline_image_url,
					searchSpaceId: createDto.search_space_id,
					authorId: userId,
				},
			});

			await this.indexNotebook(notebook).catch((err) =>
				this.logger.warn(
					`Failed to index notebook ${notebook.id}: ${err.message}`,
				),
			);

			return this.toDto(notebook);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create notebook: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		searchSpaceId: number,
		skip: number = 0,
		limit: number = 50,
		search?: string,
		status?: "all" | "published" | "unpublished",
		sort: string = "created",
		sortDir: string = "desc",
	): Promise<PaginatedNotebooksResponseDto> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			await this.permissionsService.requireRead(searchSpaceId, userId);

			const where: any = {
				searchSpaceId,
			};

			if (search && search.trim()) {
				const q = search.trim();
				where.OR = [
					{ title: { contains: q, mode: "insensitive" } },
					{ slug: { contains: q, mode: "insensitive" } },
					{ excerpt: { contains: q, mode: "insensitive" } },
				];
			}

			if (status === "published") {
				where.isPublished = true;
			} else if (status === "unpublished") {
				where.isPublished = false;
			}

			const sortFieldMap: Record<string, string> = {
				title: "title",
				status: "isPublished",
				created: "createdAt",
			};
			const prismaField = sortFieldMap[sort] || "createdAt";
			const prismaDir = sortDir === "asc" ? "asc" : "desc";
			const orderBy = { [prismaField]: prismaDir };

			const select = {
				id: true,
				title: true,
				slug: true,
				excerpt: true,
				headlineImageUrl: true,
				isPublished: true,
				publishedAt: true,
				authorId: true,
				searchSpaceId: true,
				createdAt: true,
				updatedAt: true,
			};

			const [notebooks, total] = await Promise.all([
				this.prisma.notebook.findMany({
					where,
					skip,
					take: limit,
					orderBy,
					select,
				}),
				this.prisma.notebook.count({ where }),
			]);

			return {
				items: notebooks.map((notebook) => this.toListItemDto(notebook)),
				total,
			};
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch notebooks: ${error.message}`,
			);
		}
	}

	async findOne(
		notebookId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
				},
				include: { author: { select: { fullName: true, picture: true } } },
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.permissionsService.requireRead(notebook.searchSpaceId, userId);

			return this.toDto(notebook);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch notebook: ${error.message}`,
			);
		}
	}

	async update(
		notebookId: number,
		searchSpaceId: number,
		updateDto: UpdateNotebookDto,
		userId: string,
	): Promise<NotebookDto> {
		try {
			if (
				updateDto.headline_image_url &&
				!this.uploadService.isOwnedUrl(updateDto.headline_image_url)
			) {
				throw new BadRequestException(
					"headline_image_url must point to application-managed storage",
				);
			}

			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.permissionsService.requireWrite(notebook.searchSpaceId, userId);

			if (
				updateDto.headline_image_url !== undefined &&
				notebook.headlineImageUrl &&
				notebook.headlineImageUrl !== updateDto.headline_image_url
			) {
				await this.uploadService
					.delete(notebook.headlineImageUrl)
					.catch((err) =>
						this.logger.warn(
							`Failed to delete old headline image: ${err.message}`,
						),
					);
			}

			const updated = await this.prisma.notebook.update({
				where: { id: notebookId },
				data: {
					title: updateDto.title,
					content: updateDto.content,
					excerpt: updateDto.excerpt,
					headlineImageUrl: updateDto.headline_image_url,
				},
				include: { author: { select: { fullName: true, picture: true } } },
			});

			await this.indexNotebook(updated).catch((err) =>
				this.logger.warn(
					`Failed to re-index notebook ${updated.id}: ${err.message}`,
				),
			);

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update notebook: ${error.message}`,
			);
		}
	}

	async remove(
		notebookId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.permissionsService.requireWrite(notebook.searchSpaceId, userId);

			await this.prisma.document.deleteMany({
				where: { notebookId: notebook.id },
			});

			if (notebook.headlineImageUrl) {
				await this.uploadService
					.delete(notebook.headlineImageUrl)
					.catch((err) =>
						this.logger.warn(`Failed to delete headline image: ${err.message}`),
					);
			}

			await this.uploadService.deleteAllFromContent(notebook.content);
			await this.prisma.notebook.delete({
				where: { id: notebookId },
			});

			return { message: "Notebook deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete notebook: ${error.message}`,
			);
		}
	}

	async publish(
		notebookId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.permissionsService.requireWrite(notebook.searchSpaceId, userId);

			if (notebook.isPublished) {
				throw new BadRequestException("Notebook is already published");
			}

			const updated = await this.prisma.notebook.update({
				where: { id: notebookId },
				data: {
					isPublished: true,
					publishedAt: new Date(),
				},
				include: { author: { select: { fullName: true, picture: true } } },
			});

			return this.toDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to publish notebook: ${error.message}`,
			);
		}
	}

	async unpublish(
		notebookId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.permissionsService.requireWrite(notebook.searchSpaceId, userId);

			if (!notebook.isPublished) {
				throw new BadRequestException("Notebook is not published");
			}

			const updated = await this.prisma.notebook.update({
				where: { id: notebookId },
				data: {
					isPublished: false,
					publishedAt: null,
				},
				include: { author: { select: { fullName: true, picture: true } } },
			});

			return this.toDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to unpublish notebook: ${error.message}`,
			);
		}
	}

	async findPublishedNotebooks(
		searchSpaceId?: number,
		skip: number = 0,
		limit: number = 100,
	): Promise<{ items: PublicNotebookListItemDto[]; total: number }> {
		try {
			const where: any = { isPublished: true };
			if (searchSpaceId) {
				where.searchSpaceId = searchSpaceId;
			}

			const [notebooks, total] = await Promise.all([
				this.prisma.notebook.findMany({
					where,
					orderBy: { publishedAt: "desc" },
					skip,
					take: limit,
					select: {
						id: true,
						title: true,
						slug: true,
						excerpt: true,
						headlineImageUrl: true,
						publishedAt: true,
						authorId: true,
						searchSpaceId: true,
						createdAt: true,
						updatedAt: true,
						author: { select: { fullName: true, picture: true } },
					},
				}),
				this.prisma.notebook.count({ where }),
			]);

			return {
				items: notebooks.map((n) => this.toPublicListItemDto(n)),
				total,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch published notebooks: ${error.message}`,
			);
		}
	}

	async findPublishedBySlug(slug: string): Promise<PublicNotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findUnique({
				where: { slug },
				include: { author: { select: { fullName: true, picture: true } } },
			});

			if (!notebook || !notebook.isPublished) {
				throw new NotFoundException("Published notebook not found");
			}

			return this.toPublicDto(notebook);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch published notebook: ${error.message}`,
			);
		}
	}

	private async indexNotebook(notebook: {
		id: number;
		title: string;
		content: string;
		excerpt: string | null;
		searchSpaceId: number;
	}): Promise<void> {
		this.logger.log(`Indexing notebook ${notebook.id} for RAG search`);

		try {
			let markdown: string;
			let images: { index: number; url: string; altText?: string }[];

			try {
				const result = notebookHtmlToMarkdown(notebook.content);
				markdown = result.markdown;
				images = result.images;
			} catch (err) {
				const fallback = err as Error & {
					fallbackMarkdown?: string;
					images?: { index: number; url: string; altText?: string }[];
				};
				this.logger.warn(
					`Notebook ${notebook.id}: ${err instanceof Error ? err.message : String(err)}`,
				);
				markdown = fallback.fallbackMarkdown || "";
				images = fallback.images || [];
			}

			if (!markdown || markdown.trim().length === 0) {
				this.logger.warn(
					`Notebook ${notebook.id} has no text content after conversion, skipping indexing`,
				);
				return;
			}

			const contentHash = crypto
				.createHash("sha256")
				.update(`${notebook.content}-${notebook.searchSpaceId}`)
				.digest("hex");

			const uniqueIdentifierHash = crypto
				.createHash("sha256")
				.update(`NOTEBOOK-${notebook.id}-${notebook.searchSpaceId}`)
				.digest("hex");

			const existingDocument = await this.prisma.document.findFirst({
				where: { notebookId: notebook.id },
				include: { chunks: true },
			});

			if (existingDocument && existingDocument.contentHash === contentHash) {
				this.logger.log(
					`Notebook ${notebook.id} content unchanged, skipping re-indexing`,
				);
				return;
			}

			this.logger.log(
				`Notebook ${notebook.id}: extracted ${images.length} image(s), ${markdown.length} chars markdown`,
			);

			const chunks = await chunkMarkdownContent(
				markdown,
				this.textSplitter,
				"notebook",
			);

			const avgChunkChars =
				chunks.length > 0
					? Math.round(
							chunks.reduce((acc, chunk) => acc + chunk.length, 0) /
								chunks.length,
						)
					: 0;
			this.logger.debug(
				`Chunking stats[notebook]: raw=${markdown.length} chunks=${chunks.length} avg=${avgChunkChars}`,
			);

			const chunksWithEmbeddings = await Promise.all(
				chunks.map(async (chunkText) => ({
					content: chunkText,
					embedding: await this.embeddingService.embed(chunkText),
				})),
			);

			const summaryText = notebook.excerpt
				? `${notebook.title}\n\n${notebook.excerpt}`
				: notebook.title;
			const summaryEmbedding = await this.embeddingService.embed(summaryText);

			let documentId: number;

			if (existingDocument) {
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: notebook.title,
						content: summaryText,
						contentHash,
						documentMetadata: {
							NOTEBOOK_ID: notebook.id,
						},
					},
				});

				await this.updateDocumentEmbedding(
					existingDocument.id,
					summaryEmbedding,
				);
				await this.insertChunksWithEmbeddings(
					existingDocument.id,
					chunksWithEmbeddings,
				);

				documentId = existingDocument.id;
				this.logger.log(
					`Re-indexed notebook ${notebook.id}: ${chunksWithEmbeddings.length} chunks`,
				);
			} else {
				const document = await this.prisma.document.create({
					data: {
						searchSpaceId: notebook.searchSpaceId,
						title: notebook.title,
						documentType: DocumentType.NOTEBOOK,
						documentMetadata: { NOTEBOOK_ID: notebook.id },
						content: summaryText,
						contentHash,
						uniqueIdentifierHash,
						notebookId: notebook.id,
					},
				});

				await this.updateDocumentEmbedding(document.id, summaryEmbedding);
				await this.insertChunksWithEmbeddings(
					document.id,
					chunksWithEmbeddings,
				);

				documentId = document.id;
				this.logger.log(
					`Indexed notebook ${notebook.id}: document ${document.id}, ${chunksWithEmbeddings.length} chunks`,
				);
			}

			await this.enqueueImageAnalysis(
				documentId,
				notebook.searchSpaceId,
				images,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index notebook ${notebook.id}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	private async enqueueImageAnalysis(
		documentId: number,
		searchSpaceId: number,
		images: { index: number; url: string; altText?: string }[],
	): Promise<void> {
		if (images.length === 0) return;

		try {
			const imageCandidates: ImageCandidate[] = images.map((img, idx) => ({
				imageId: `img_${String(idx + 1).padStart(3, "0")}`,
				url: img.url,
				altText: img.altText,
			}));

			await this.imageAnalysisService.analyzeDocumentImages({
				documentId,
				searchSpaceId,
				sourceType: "markdown",
				images: imageCandidates,
			});

			this.logger.log(
				`Enqueued image analysis for notebook document ${documentId}: ${imageCandidates.length} images`,
			);
		} catch (error) {
			this.logger.warn(
				`Failed to enqueue image analysis for document ${documentId}: ${error.message}`,
			);
		}
	}

	private async insertChunksWithEmbeddings(
		documentId: number,
		chunks: { content: string; embedding: number[] }[],
	): Promise<void> {
		for (const chunk of chunks) {
			const vectorString = `[${chunk.embedding.join(",")}]`;
			await this.prisma.$executeRawUnsafe(
				`INSERT INTO chunks (content, embedding, document_id, created_at) VALUES ($1, $2::vector, $3, NOW())`,
				chunk.content,
				vectorString,
				documentId,
			);
		}
	}

	private async updateDocumentEmbedding(
		documentId: number,
		embedding: number[],
	): Promise<void> {
		const vectorString = `[${embedding.join(",")}]`;
		await this.prisma.$executeRawUnsafe(
			`UPDATE documents SET embedding = $1::vector WHERE id = $2`,
			vectorString,
			documentId,
		);
	}

	private toDto(
		notebook: PrismaNotebook & {
			author?: { fullName: string | null; picture: string | null } | null;
		},
	): NotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			excerpt: notebook.excerpt,
			headline_image_url: notebook.headlineImageUrl,
			is_published: notebook.isPublished,
			published_at: notebook.publishedAt,
			search_space_id: notebook.searchSpaceId,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toListItemDto(notebook: any): NotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			excerpt: notebook.excerpt,
			headline_image_url: notebook.headlineImageUrl,
			is_published: notebook.isPublished,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toPublicListItemDto(notebook: any): PublicNotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			excerpt: notebook.excerpt,
			headline_image_url: notebook.headlineImageUrl,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toPublicDto(notebook: any): PublicNotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			excerpt: notebook.excerpt,
			headline_image_url: notebook.headlineImageUrl,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}
}
