import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { DocumentType, Notebook as PrismaNotebook } from "@prisma/client";
import * as crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "../retriever/embedding.service";
import { ImageAnalysisService } from "../services/image-analysis.service";
import { UploadService } from "../upload";
import {
	chunkMarkdownContent,
	createMarkdownAwareSplitter,
} from "../utils/chunking";
import { stripHtmlAndExtractImages } from "../utils/html-stripper";
import { ImageCandidate } from "../utils/image-markdown";
import {
	NotebookDto,
	NotebookListItemDto,
	CreateNotebookDto,
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

	private async generateSlug(title: string, attempt = 0): Promise<string> {
		if (attempt > 10) throw new InternalServerErrorException("Failed to generate unique slug");

		const base = title
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
			await this.checkSearchSpaceOwnership(createDto.search_space_id, userId);

			const slug = await this.generateSlug(createDto.title);

			const notebook = await this.prisma.notebook.create({
				data: {
					title: createDto.title,
					slug,
					content: createDto.content,
					excerpt: createDto.excerpt,
					searchSpaceId: createDto.search_space_id,
					authorId: userId,
				},
			});

			await this.indexNotebook(notebook).catch((err) =>
				this.logger.warn(`Failed to index notebook ${notebook.id}: ${err.message}`),
			);

			return this.toDto(notebook);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
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
		limit: number = 100,
	): Promise<NotebookListItemDto[]> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			await this.checkSearchSpaceOwnership(searchSpaceId, userId);

			const notebooks = await this.prisma.notebook.findMany({
				where: {
					searchSpaceId,
					searchSpace: { userId },
				},
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					title: true,
					slug: true,
					excerpt: true,
					authorId: true,
					searchSpaceId: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return notebooks.map((notebook) => ({
				id: notebook.id,
				title: notebook.title,
				slug: notebook.slug,
				excerpt: notebook.excerpt,
				author_id: notebook.authorId,
				search_space_id: notebook.searchSpaceId,
				created_at: notebook.createdAt,
				updated_at: notebook.updatedAt,
			}));
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch notebooks: ${error.message}`,
			);
		}
	}

	async findOne(notebookId: number, searchSpaceId: number, userId: string): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			return this.toDto(notebook);
		} catch (error) {
			if (error instanceof NotFoundException) {
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
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			const updated = await this.prisma.notebook.update({
				where: { id: notebookId },
				data: {
					title: updateDto.title,
					content: updateDto.content,
					excerpt: updateDto.excerpt,
				},
			});

			await this.indexNotebook(updated).catch((err) =>
				this.logger.warn(`Failed to re-index notebook ${updated.id}: ${err.message}`),
			);

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update notebook: ${error.message}`,
			);
		}
	}

	async remove(notebookId: number, searchSpaceId: number, userId: string): Promise<{ message: string }> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.prisma.document.deleteMany({
				where: { notebookId: notebook.id },
			});

			await this.uploadService.deleteAllFromContent(notebook.content);
			await this.prisma.notebook.delete({
				where: { id: notebookId },
			});

			return { message: "Notebook deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete notebook: ${error.message}`,
			);
		}
	}

	/**
	 * Index a notebook for RAG search.
	 *
	 * 1. Strips HTML from content using stripHtmlAndExtractImages, which:
	 *    - Removes ALL HTML tag attributes (style, class, etc.)
	 *    - Converts <img> tags to markdown image references: ![Image N: alt](url)
	 *    - Returns extracted image URLs for vision analysis
	 * 2. Chunks the markdown text (with inline image references) and generates embeddings
	 * 3. Upserts a Document of type NOTEBOOK linked to this notebook
	 * 4. Enqueues image analysis for extracted images via Gemini vision model
	 *    (Image descriptions are embedded as separate <image_chunk> entries)
	 */
	private async indexNotebook(notebook: {
		id: number;
		title: string;
		content: string;
		excerpt: string | null;
		searchSpaceId: number;
	}): Promise<void> {
		this.logger.log(`Indexing notebook ${notebook.id} for RAG search`);

		try {
			const { plainText, images } = stripHtmlAndExtractImages(notebook.content);

			if (!plainText || plainText.trim().length === 0) {
				this.logger.warn(
					`Notebook ${notebook.id} has no text content after HTML stripping, skipping indexing`,
				);
				return;
			}

			// Generate content hash from the raw content (not stripped, so re-index triggers on any change)
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
				this.logger.log(`Notebook ${notebook.id} content unchanged, skipping re-indexing`);
				return;
			}

			this.logger.log(
				`Notebook ${notebook.id}: extracted ${images.length} image(s), ${plainText.length} chars text`,
			);

			const chunks = await chunkMarkdownContent(plainText, this.textSplitter, "generic");

			const avgChunkChars =
				chunks.length > 0
					? Math.round(
							chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length,
						)
					: 0;
			this.logger.debug(
				`Chunking stats[notebook]: raw=${plainText.length} chunks=${chunks.length} avg=${avgChunkChars}`,
			);

			const chunksWithEmbeddings = await Promise.all(
				chunks.map(async (chunkText) => ({
					content: chunkText,
					embedding: await this.embeddingService.embed(chunkText),
				})),
			);

			// Generate document summary embedding (using title + excerpt as summary)
			const summaryText = notebook.excerpt
				? `${notebook.title}\n\n${notebook.excerpt}`
				: notebook.title;
			const summaryEmbedding = await this.embeddingService.embed(summaryText);

			let documentId: number;

			if (existingDocument) {
				// Delete old chunks first
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

				await this.updateDocumentEmbedding(existingDocument.id, summaryEmbedding);
				await this.insertChunksWithEmbeddings(existingDocument.id, chunksWithEmbeddings);

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
				await this.insertChunksWithEmbeddings(document.id, chunksWithEmbeddings);

				documentId = document.id;
				this.logger.log(
					`Indexed notebook ${notebook.id}: document ${document.id}, ${chunksWithEmbeddings.length} chunks`,
				);
			}

			// Enqueue image analysis for extracted images using Gemini vision
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

	/**
	 * Enqueue image analysis for notebook images using the same Gemini vision
	 * pipeline that URL/webpage documents use.
	 *
	 * Converts ImagePlaceholder[] to ImageCandidate[] format expected by
	 * ImageAnalysisService, then delegates to analyzeDocumentImages which:
	 * - Fetches each image from its URL (S3 public URL)
	 * - Sends to Gemini vision model for description
	 * - Creates <image_chunk> entries with embeddings alongside text chunks
	 */
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

	private toDto(notebook: PrismaNotebook): NotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			excerpt: notebook.excerpt,
			search_space_id: notebook.searchSpaceId,
			author_id: notebook.authorId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toListItemDto(notebook: {
		id: number;
		title: string;
		slug: string;
		excerpt: string | null;
		authorId: string;
		searchSpaceId: number;
		createdAt: Date;
		updatedAt: Date;
	}): NotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			excerpt: notebook.excerpt,
			author_id: notebook.authorId,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}
}
