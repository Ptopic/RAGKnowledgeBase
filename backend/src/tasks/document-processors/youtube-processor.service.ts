/**
 * YouTube video document processor.
 */

import * as crypto from "node:crypto";
import { ChatOpenAI } from "@langchain/openai";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DocumentType, Log } from "@prisma/client";
import axios, { AxiosInstance } from "axios";
import { PrismaService } from "../../prisma/prisma.service";
import { SUMMARY_PROMPT_TEMPLATE } from "../../prompts";
import { EmbeddingService } from "../../retriever/embedding.service";
import { ImageAnalysisService } from "../../services/image-analysis.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import { SseService } from "../../sse/sse.service";
import { optimizeContentForContextWindow } from "../../utils/document-converters";
import {
	chunkMarkdownContent,
	createMarkdownAwareSplitter,
} from "../../utils/chunking";
import { extractImageCandidatesFromMarkdown } from "../../utils/image-markdown";
import { DocumentProcessorBaseService } from "./base.service";

@Injectable()
export class YoutubeProcessorService {
	private readonly logger = new Logger(YoutubeProcessorService.name);
	private readonly textSplitter = createMarkdownAwareSplitter();
	private readonly axiosInstance: AxiosInstance;
	private readonly brightDataApiKey: string | undefined;
	private readonly brightDataEnabled: boolean;

	constructor(
		private prisma: PrismaService,
		private baseService: DocumentProcessorBaseService,
		private embeddingService: EmbeddingService,
		private imageAnalysisService: ImageAnalysisService,
		private sseService: SseService,
	) {
		// Initialize BrightData configuration
		this.brightDataApiKey = process.env.BRIGHTDATA_API_KEY;
		this.brightDataEnabled = !!this.brightDataApiKey;

		// Initialize axios instance for BrightData API
		this.axiosInstance = axios.create({
			timeout: 60000, // 60 seconds timeout
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (this.brightDataEnabled) {
			this.logger.log("BrightData integration enabled for YouTube processing");
		} else {
			this.logger.warn(
				"BrightData is not configured. Set BRIGHTDATA_API_KEY to enable YouTube transcript extraction.",
			);
		}
	}

	/**
	 * Extract video ID from various YouTube URL formats.
	 *
	 * @param url - YouTube URL
	 * @returns Video ID if found, null otherwise
	 */
	private getYoutubeVideoId(url: string): string | null {
		try {
			const parsedUrl = new URL(url);
			const hostname = parsedUrl.hostname;

			if (hostname === "youtu.be") {
				return parsedUrl.pathname.substring(1);
			}
			if (hostname === "www.youtube.com" || hostname === "youtube.com") {
				if (parsedUrl.pathname === "/watch") {
					return parsedUrl.searchParams.get("v");
				}
				if (parsedUrl.pathname.startsWith("/embed/")) {
					return parsedUrl.pathname.split("/")[2];
				}
				if (parsedUrl.pathname.startsWith("/v/")) {
					return parsedUrl.pathname.split("/")[2];
				}
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Create document chunks with embeddings.
	 */
	private async createDocumentChunks(
		content: string,
	): Promise<{ content: string; embedding: number[] }[]> {
		const chunks = await chunkMarkdownContent(
			content,
			this.textSplitter,
			"youtube",
		);
		const avgChunkChars =
			chunks.length > 0
				? Math.round(chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length)
				: 0;
		const tinyChunkCount = chunks.filter((chunk) => chunk.length < 120).length;
		this.logger.debug(
			`Chunking stats[youtube]: raw=${content.length} chunks=${chunks.length} avg=${avgChunkChars} tiny=${tinyChunkCount}`,
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
				`Generating AI summary for YouTube video with ${optimizedContent.length} characters`,
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
			this.logger.log("Generating embedding for document summary");
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
	 * Helper method to insert chunks with embeddings using raw SQL.
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

	private async enqueueImageAnalysisJob(
		documentId: number,
		searchSpaceId: number,
		markdown: string,
		sourceType: "file" | "web" | "markdown" | "youtube",
	): Promise<void> {
		try {
			const images = extractImageCandidatesFromMarkdown(markdown);
			if (images.length === 0) return;

			await this.imageAnalysisService.analyzeDocumentImages({
				documentId,
				searchSpaceId,
				sourceType,
				images,
			});
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
	 * Trigger BrightData YouTube video scrape using webhook approach.
	 * This method initiates async scraping - results will be sent to the webhook.
	 *
	 * @param videoUrl - YouTube video URL
	 * @param searchSpaceId - Search space ID for context
	 * @param userId - User ID for context
	 * @returns Snapshot ID for tracking
	 */
	async triggerYoutubeVideoScrape(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
	): Promise<string> {
		if (!this.brightDataEnabled) {
			throw new HttpException(
				"BrightData service is not configured. Please set BRIGHTDATA_API_KEY.",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			// Pass context via webhook URL query parameters instead of in payload
			// BrightData doesn't accept custom fields in the trigger payload
			const webhookUrl = `${process.env.API_URL}/agent/webhook?search_space_id=${searchSpaceId}&user_id=${userId}&video_url=${encodeURIComponent(videoUrl)}`;

			// BrightData expects an array of input objects - only send the URL field
			const payload = [
				{
					url: videoUrl,
				},
			];

			this.logger.log(
				`Triggering BrightData scrape for: ${videoUrl} (searchSpace: ${searchSpaceId}, user: ${userId})`,
			);

			const response = await this.axiosInstance.post(
				`https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk56epmy2i5g7lzu0k&endpoint=${encodeURIComponent(webhookUrl)}&format=json&uncompressed_webhook=true&include_errors=true`,
				payload,
				{
					headers: {
						Authorization: `Bearer ${this.brightDataApiKey}`,
						"Content-Type": "application/json",
					},
				},
			);

			const result = response.data;
			const snapshotId = result.snapshot_id;

			this.logger.log(
				`BrightData scrape triggered successfully. Snapshot ID: ${snapshotId}`,
			);

			return snapshotId;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const status =
					error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
				const message =
					error.response?.data?.error ||
					error.response?.data?.message ||
					error.message;

				this.logger.error(`BrightData trigger error: ${message}`, error.stack);
				this.logger.error(
					`Response data: ${JSON.stringify(error.response?.data)}`,
				);

				throw new HttpException(
					`Failed to trigger BrightData scrape: ${message}`,
					status,
				);
			}

			this.logger.error(
				`Error triggering BrightData scrape: ${error.message}`,
				error.stack,
			);
			throw new HttpException(
				`Failed to trigger BrightData scrape: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Add YouTube video transcript to vector store.
	 * This is a simplified version for processing BrightData webhook results.
	 *
	 * @param videoData - Video data from BrightData webhook
	 */
	async addYTVideoToVectorStore(videoData: {
		transcript: string;
		video_id: string;
		title: string;
		url: string;
		searchSpaceId: number;
		userId: string;
	}): Promise<void> {
		const { transcript, video_id, title, url, searchSpaceId, userId } =
			videoData;

		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
			this.sseService,
		);

		let logEntry: Log | null = null;

		try {
			// Log task start
			logEntry = await taskLogger.logTaskStart(
				"youtube_webhook_processing",
				"webhook",
				`Processing YouTube transcript from BrightData webhook: ${title}`,
				{ video_id, url, user_id: userId },
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Processing transcript for video: ${title}`,
				{ stage: "transcript_processing", video_id },
			);

			// Format document metadata
			const metadataSections: [string, string[]][] = [
				[
					"METADATA",
					[`TITLE: ${title}`, `URL: ${url}`, `VIDEO_ID: ${video_id}`],
				],
				[
					"CONTENT",
					["FORMAT: transcript", "TEXT_START", transcript, "TEXT_END"],
				],
			];

			// Build the document string
			const documentParts: string[] = [];
			documentParts.push("<DOCUMENT>");

			for (const [sectionTitle, sectionContent] of metadataSections) {
				documentParts.push(`<${sectionTitle}>`);
				documentParts.push(...sectionContent);
				documentParts.push(`</${sectionTitle}>`);
			}

			documentParts.push("</DOCUMENT>");
			const combinedDocumentString = documentParts.join("\n");

			// Generate unique identifier hash for this YouTube video
			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.YOUTUBE_VIDEO,
				video_id,
				searchSpaceId,
			);

			// Generate content hash
			const contentHash = this.generateContentHash(
				combinedDocumentString,
				searchSpaceId,
			);

			// Check if document with this unique identifier already exists
			await taskLogger.logTaskProgress(
				logEntry,
				`Checking for existing video: ${video_id}`,
				{ stage: "duplicate_check", video_id },
			);

			const existingDocument =
				await this.baseService.checkDocumentByUniqueIdentifier(
					uniqueIdentifierHash,
				);

			if (existingDocument) {
				// Document exists - check if content has changed
				if (existingDocument.contentHash === contentHash) {
					await taskLogger.logTaskSuccess(
						logEntry,
						`YouTube video document unchanged: ${title}`,
						{
							duplicate_detected: true,
							existing_document_id: existingDocument.id,
							video_id,
						},
					);
					this.logger.log(
						`Document for YouTube video ${video_id} unchanged. Skipping.`,
					);
					return;
				}
				// Content has changed - update the existing document
				this.logger.log(
					`Content changed for YouTube video ${video_id}. Updating document.`,
				);
				await taskLogger.logTaskProgress(
					logEntry,
					`Updating YouTube video document: ${title}`,
					{ stage: "document_update", video_id },
				);
			}

			// Generate summary with metadata
			await taskLogger.logTaskProgress(
				logEntry,
				`Generating summary for video: ${title}`,
				{ stage: "summary_generation" },
			);

			const documentMetadata = {
				url,
				video_id,
				title,
				document_type: "YouTube Video Document",
				has_transcript: true,
			};

			const { summaryContent, summaryEmbedding } =
				await this.generateDocumentSummary(
					combinedDocumentString,
					documentMetadata,
				);

			// Process chunks
			await taskLogger.logTaskProgress(
				logEntry,
				`Processing content chunks for video: ${title}`,
				{ stage: "chunk_processing" },
			);

			const chunks = await this.createDocumentChunks(combinedDocumentString);

			// Update or create document
			if (existingDocument) {
				// Delete old chunks first
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				// Update existing document
				await taskLogger.logTaskProgress(
					logEntry,
					`Updating YouTube video document in database: ${title}`,
					{ stage: "database_update", chunks_count: chunks.length },
				);

				const updatedDocument = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							url,
							video_id,
							video_title: title,
						} as any,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(
					updatedDocument.id,
					summaryEmbedding,
				);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);
				await this.enqueueImageAnalysisJob(
					updatedDocument.id,
					searchSpaceId,
					combinedDocumentString,
					"youtube",
				);

				await taskLogger.logTaskSuccess(
					logEntry,
					`Successfully processed YouTube video from webhook: ${title}`,
					{
						document_id: updatedDocument.id,
						video_id,
						title: updatedDocument.title,
						content_hash: contentHash,
						chunks_count: chunks.length,
						summary_length: summaryContent.length,
					},
				);

				return;
			}

			// Create new document
			await taskLogger.logTaskProgress(
				logEntry,
				`Creating YouTube video document in database: ${title}`,
				{ stage: "document_creation", chunks_count: chunks.length },
			);

			const document = await this.prisma.document.create({
				data: {
					title,
					documentType: DocumentType.YOUTUBE_VIDEO,
					documentMetadata: {
						url,
						video_id,
						video_title: title,
					} as any,
					content: summaryContent,
					searchSpaceId,
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
				combinedDocumentString,
				"youtube",
			);

			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully processed YouTube video from webhook: ${title}`,
				{
					document_id: document.id,
					video_id,
					title: document.title,
					content_hash: contentHash,
					chunks_count: chunks.length,
					summary_length: summaryContent.length,
				},
			);
		} catch (error) {
			if (logEntry) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to process YouTube video from webhook: ${title}`,
					error.message,
					{ error_type: error.name, video_id, url },
				);
			}

			this.logger.error(
				`Failed to process YouTube video from webhook: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
