/**
 * Markdown file document processor.
 */

import * as crypto from "node:crypto";
import { ChatOpenAI } from "@langchain/openai";
import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bull";
import { Document, DocumentType, Log } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SUMMARY_PROMPT_TEMPLATE } from "../../prompts";
import { EmbeddingService } from "../../retriever/embedding.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import { optimizeContentForContextWindow } from "../../utils/document-converters";
import {
	chunkMarkdownContent,
	createMarkdownAwareSplitter,
} from "../../utils/chunking";
import { extractImageCandidatesFromMarkdown } from "../../utils/image-markdown";
import { DocumentProcessorBaseService } from "./base.service";

@Injectable()
export class MarkdownProcessorService {
	private readonly logger = new Logger(MarkdownProcessorService.name);
	private readonly textSplitter = createMarkdownAwareSplitter();

	constructor(
		private prisma: PrismaService,
		private baseService: DocumentProcessorBaseService,
		private embeddingService: EmbeddingService,
		@InjectQueue("document-tasks") private documentTasksQueue: Queue,
	) {}

	/**
	 * Create document chunks with embeddings.
	 */
	private async createDocumentChunks(
		content: string,
	): Promise<{ content: string; embedding: number[] }[]> {
		const chunks = await chunkMarkdownContent(
			content,
			this.textSplitter,
			"generic",
		);
		const avgChunkChars =
			chunks.length > 0
				? Math.round(chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length)
				: 0;
		const tinyChunkCount = chunks.filter((chunk) => chunk.length < 120).length;
		this.logger.debug(
			`Chunking stats[markdown]: raw=${content.length} chunks=${chunks.length} avg=${avgChunkChars} tiny=${tinyChunkCount}`,
		);

		return Promise.all(
			chunks.map(async (chunkText) => ({
				content: chunkText,
				embedding: await this.embeddingService.embed(chunkText),
			})),
		);
	}

	/**
	 * Generate document summary with metadata using AI (GPT-4o).
	 * Uses the same approach as the Python backend for consistency.
	 */
	private async generateDocumentSummary(
		content: string,
		// biome-ignore lint/suspicious/noExplicitAny: Metadata can have any shape
		metadata: Record<string, any>,
	): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
		try {
			// Always use GPT-4o for document summaries (high quality, large context window)
			const modelName = "gpt-4o";
			const llm = new ChatOpenAI({
				modelName,
				temperature: 0.3, // Slightly creative but mostly factual
				openAIApiKey: process.env.OPENAI_API_KEY,
			});

			// Optimize content to fit within context window
			const optimizedContent = optimizeContentForContextWindow(
				content,
				metadata,
				modelName,
			);

			// Prepare document with metadata for LLM
			const contentWithMetadata = `<DOCUMENT><DOCUMENT_METADATA>\n\n${JSON.stringify(metadata, null, 2)}\n\n</DOCUMENT_METADATA>\n\n<DOCUMENT_CONTENT>\n\n${optimizedContent}\n\n</DOCUMENT_CONTENT></DOCUMENT>`;

			// Generate summary using LLM
			this.logger.log(
				`Generating AI summary for markdown document with ${optimizedContent.length} characters`,
			);
			const summaryChain = SUMMARY_PROMPT_TEMPLATE.pipe(llm);
			const summaryResult = await summaryChain.invoke({
				document: contentWithMetadata,
			});

			// Extract summary content from result
			const summaryContent =
				typeof summaryResult === "string"
					? summaryResult
					: (summaryResult as { content?: string }).content ||
						String(summaryResult);

			// Enhance summary with metadata section
			const metadataParts = ["# DOCUMENT METADATA"];

			for (const [key, value] of Object.entries(metadata)) {
				if (value) {
					const formattedKey = key
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase());
					metadataParts.push(`**${formattedKey}:** ${value}`);
				}
			}

			const metadataSection = metadataParts.join("\n");
			const enhancedSummaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${summaryContent}`;

			// Generate embedding for the enhanced summary
			this.logger.log("Generating embedding for markdown document summary");
			const summaryEmbedding = await this.embeddingService.embed(
				enhancedSummaryContent,
			);

			return { summaryContent: enhancedSummaryContent, summaryEmbedding };
		} catch (error) {
			this.logger.error(
				`Failed to generate AI summary, falling back to simple summary: ${error.message}`,
			);

			// Fallback to simple summary if AI generation fails
			const metadataParts: string[] = ["# DOCUMENT METADATA"];

			for (const [key, value] of Object.entries(metadata)) {
				if (value) {
					const formattedKey = key
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase());
					metadataParts.push(`**${formattedKey}:** ${value}`);
				}
			}

			const metadataSection = metadataParts.join("\n");
			const summaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${content.substring(0, 5000)}`;

			// Generate embedding for the fallback summary
			const summaryEmbedding =
				await this.embeddingService.embed(summaryContent);

			return { summaryContent, summaryEmbedding };
		}
	}

	/**
	 * Process and store a markdown file document.
	 */
	async addReceivedMarkdownFileDocument(
		fileName: string,
		fileInMarkdown: string,
		searchSpaceId: number,
		userId: string,
	): Promise<Document | null> {
		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
		);

		// Log task start
		const logEntry: Log = await taskLogger.logTaskStart(
			"markdown_file_document",
			"background_task",
			`Processing markdown file: ${fileName}`,
			{
				filename: fileName,
				user_id: userId,
				content_length: fileInMarkdown.length,
			},
		);

		try {
			// Generate unique identifier hash for this markdown file
			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.FILE,
				fileName,
				searchSpaceId,
			);

			// Generate content hash
			const contentHash = this.generateContentHash(
				fileInMarkdown,
				searchSpaceId,
			);

			// Check if document with this unique identifier already exists
			const existingDocument =
				await this.baseService.checkDocumentByUniqueIdentifier(
					uniqueIdentifierHash,
				);

			if (existingDocument) {
				// Document exists - check if content has changed
				if (existingDocument.contentHash === contentHash) {
					await taskLogger.logTaskSuccess(
						logEntry,
						`Markdown file document unchanged: ${fileName}`,
						{
							duplicate_detected: true,
							existing_document_id: existingDocument.id,
						},
					);
					this.logger.log(
						`Document for markdown file ${fileName} unchanged. Skipping.`,
					);
					return existingDocument;
				}
				// Content has changed - update the existing document
				this.logger.log(
					`Content changed for markdown file ${fileName}. Updating document.`,
				);
			}

			// Generate summary with metadata
			await taskLogger.logTaskProgress(
				logEntry,
				`Generating summary for markdown file: ${fileName}`,
				{ processing_stage: "summary_generation" },
			);

			const documentMetadata = {
				file_name: fileName,
				document_type: "Markdown File Document",
			};

			const { summaryContent, summaryEmbedding } =
				await this.generateDocumentSummary(fileInMarkdown, documentMetadata);

			// Process chunks
			await taskLogger.logTaskProgress(
				logEntry,
				`Processing content chunks for markdown file: ${fileName}`,
				{ processing_stage: "chunk_processing" },
			);

			const chunks = await this.createDocumentChunks(fileInMarkdown);

			// Update or create document
			let document: Document;
			if (existingDocument) {
				// Delete old chunks first
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				// Update existing document
				document = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: fileName,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							FILE_NAME: fileName,
						},
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(document.id, summaryEmbedding);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(document.id, chunks);
				await this.enqueueImageAnalysisJob(
					document.id,
					searchSpaceId,
					fileInMarkdown,
					"markdown",
				);
			} else {
				// Create new document
				document = await this.prisma.document.create({
					data: {
						searchSpaceId,
						title: fileName,
						documentType: DocumentType.FILE,
						documentMetadata: {
							FILE_NAME: fileName,
						},
						content: summaryContent,
						contentHash,
						uniqueIdentifierHash,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(document.id, summaryEmbedding);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(document.id, chunks);
				await this.enqueueImageAnalysisJob(
					document.id,
					searchSpaceId,
					fileInMarkdown,
					"markdown",
				);
			}

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully processed markdown file: ${fileName}`,
				{
					document_id: document.id,
					content_hash: contentHash,
					chunks_count: chunks.length,
					summary_length: summaryContent.length,
				},
			);

			return document;
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to process markdown file: ${fileName}`,
				error.message,
				{ error_type: error.name },
			);

			this.logger.error(
				`Failed to process markdown file: ${error.message}`,
				error.stack,
			);
			throw new Error(`Failed to process file document: ${error.message}`);
		}
	}

	private async enqueueImageAnalysisJob(
		documentId: number,
		searchSpaceId: number,
		markdown: string,
		sourceType: "file" | "web" | "markdown" | "youtube",
	): Promise<void> {
		try {
			const images = extractImageCandidatesFromMarkdown(markdown);
			if (images.length === 0) return;

			await this.documentTasksQueue.add(
				"analyze_document_images",
				{ documentId, searchSpaceId, sourceType, images },
				{ removeOnComplete: true, attempts: 2 },
			);
		} catch (error) {
			this.logger.warn(`Failed to enqueue image analysis: ${error.message}`);
		}
	}

	private generateUniqueIdentifierHash(
		documentType: DocumentType,
		identifier: string,
		searchSpaceId: number,
	): string {
		const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}

	private generateContentHash(content: string, searchSpaceId: number): string {
		const hashInput = `${content}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}

	/**
	 * Helper method to insert chunks with embeddings using raw SQL.
	 * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
	 */
	private async insertChunksWithEmbeddings(
		documentId: number,
		chunks: { content: string; embedding: number[] }[],
	): Promise<void> {
		for (const chunk of chunks) {
			// Convert embedding array to PostgreSQL vector format
			const vectorString = `[${chunk.embedding.join(",")}]`;

			await this.prisma.$executeRawUnsafe(
				`INSERT INTO chunks (content, embedding, document_id, created_at) 
				 VALUES ($1, $2::vector, $3, NOW())`,
				chunk.content,
				vectorString,
				documentId,
			);
		}
	}

	/**
	 * Helper method to update document embedding using raw SQL.
	 * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
	 */
	private async updateDocumentEmbedding(
		documentId: number,
		embedding: number[],
	): Promise<void> {
		// Convert embedding array to PostgreSQL vector format
		const vectorString = `[${embedding.join(",")}]`;

		await this.prisma.$executeRawUnsafe(
			`UPDATE documents SET embedding = $1::vector WHERE id = $2`,
			vectorString,
			documentId,
		);
	}
}
