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
import {
	chunkMarkdownContent,
	createMarkdownAwareSplitter,
} from "../../utils/chunking";
import { optimizeContentForContextWindow } from "../../utils/document-converters";
import { extractImageCandidatesFromMarkdown } from "../../utils/image-markdown";
import { DocumentProcessorBaseService } from "./base.service";
import {
	YoutubeProcessingResult,
	YoutubeProcessingStrategy,
} from "./youtube-processing-strategy.interface";

@Injectable()
export class BrightdataYoutubeStrategy implements YoutubeProcessingStrategy {
	private readonly logger = new Logger(BrightdataYoutubeStrategy.name);
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
		this.brightDataApiKey = process.env.BRIGHTDATA_API_KEY;
		this.brightDataEnabled = !!this.brightDataApiKey;

		this.axiosInstance = axios.create({
			timeout: 60000,
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

	async process(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	): Promise<YoutubeProcessingResult> {
		try {
			await this.triggerYoutubeVideoScrape(
				videoUrl,
				searchSpaceId,
				userId,
				documentId,
			);
			return { success: true };
		} catch (error) {
			this.logger.error(
				`Failed to trigger BrightData scrape: ${error.message}`,
				error.stack,
			);

			await this.prisma.document.update({
				where: { id: documentId },
				data: {
					processingStatus: "FAILED",
					processingCompletedAt: new Date(),
				},
			});

			this.sseService.broadcastEvent({
				topic: "documents",
				data: { action: "update", searchSpaceId, documentId },
			});

			return { success: false, error: error.message };
		}
	}

	async triggerYoutubeVideoScrape(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId?: number,
	): Promise<string> {
		if (!this.brightDataEnabled) {
			throw new HttpException(
				"BrightData service is not configured. Please set BRIGHTDATA_API_KEY.",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			const webhookUrl = `${process.env.API_URL}/agent/webhook?search_space_id=${searchSpaceId}&user_id=${userId}&video_url=${encodeURIComponent(videoUrl)}&document_id=${documentId || ""}`;

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

	async addYTVideoToVectorStore(videoData: {
		transcript: string;
		video_id: string;
		title: string;
		url: string;
		searchSpaceId: number;
		userId: string;
		documentId?: number;
	}): Promise<void> {
		const { transcript, video_id, title, url, searchSpaceId, userId, documentId } =
			videoData;

		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
			this.sseService,
		);

		let logEntry: Log | null = null;

		try {
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

			const documentParts: string[] = [];
			documentParts.push("<DOCUMENT>");

			for (const [sectionTitle, sectionContent] of metadataSections) {
				documentParts.push(`<${sectionTitle}>`);
				documentParts.push(...sectionContent);
				documentParts.push(`</${sectionTitle}>`);
			}

			documentParts.push("</DOCUMENT>");
			const combinedDocumentString = documentParts.join("\n");

			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.YOUTUBE_VIDEO,
				video_id,
				searchSpaceId,
			);

			const contentHash = this.generateContentHash(
				combinedDocumentString,
				searchSpaceId,
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Checking for existing video: ${video_id}`,
				{ stage: "duplicate_check", video_id },
			);

			let existingDocument: any = null;
			if (documentId) {
				existingDocument = await this.prisma.document.findUnique({
					where: { id: documentId },
				});
			} else {
				existingDocument =
					await this.baseService.checkDocumentByUniqueIdentifier(
						uniqueIdentifierHash,
					);

				if (existingDocument) {
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
					this.logger.log(
						`Content changed for YouTube video ${video_id}. Updating document.`,
					);
					await taskLogger.logTaskProgress(
						logEntry,
						`Updating YouTube video document: ${title}`,
						{ stage: "document_update", video_id },
					);
				}
			}

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

			await taskLogger.logTaskProgress(
				logEntry,
				`Processing content chunks for video: ${title}`,
				{ stage: "chunk_processing" },
			);

			const chunks = await this.createDocumentChunks(combinedDocumentString);

			if (existingDocument) {
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				await taskLogger.logTaskProgress(
					logEntry,
					`Updating YouTube video document in database: ${title}`,
					{ stage: "database_update", chunks_count: chunks.length },
				);

				if (documentId) {
					const updatedDocument = await this.prisma.document.update({
						where: { id: documentId },
						data: {
							title,
							content: summaryContent,
							contentHash,
							uniqueIdentifierHash,
							documentMetadata: {
								url,
								video_id,
								video_title: title,
							} as any,
							processingStatus: "COMPLETED",
							processingCompletedAt: new Date(),
						},
						include: { chunks: true },
					});

					await this.updateDocumentEmbedding(updatedDocument.id, summaryEmbedding);
					await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);
					await this.enqueueImageAnalysisJob(updatedDocument.id, searchSpaceId, combinedDocumentString, "youtube");

					this.sseService.broadcastEvent({
						topic: "documents",
						data: { action: "update", searchSpaceId, documentId: updatedDocument.id },
					});

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

				await this.updateDocumentEmbedding(updatedDocument.id, summaryEmbedding);
				await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);
				await this.enqueueImageAnalysisJob(updatedDocument.id, searchSpaceId, combinedDocumentString, "youtube");

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

			await this.updateDocumentEmbedding(document.id, summaryEmbedding);
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
			if (documentId) {
				await this.prisma.document.update({
					where: { id: documentId },
					data: {
						processingStatus: "FAILED",
						processingCompletedAt: new Date(),
					},
				});
				this.sseService.broadcastEvent({
					topic: "documents",
					data: { action: "update", searchSpaceId, documentId },
				});
			}
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

	private async generateDocumentSummary(
		content: string,
		// biome-ignore lint/suspicious/noExplicitAny: Metadata can have any shape
		metadata: Record<string, any>,
	): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
		try {
			const modelName = "gpt-4o";
			const llm = new ChatOpenAI({
				modelName,
				temperature: 0.3,
				openAIApiKey: process.env.OPENAI_API_KEY,
			});

			const optimizedContent = optimizeContentForContextWindow(
				content,
				metadata,
				modelName,
			);

			const contentWithMetadata = `<DOCUMENT><DOCUMENT_METADATA>\n\n${JSON.stringify(metadata, null, 2)}\n\n</DOCUMENT_METADATA>\n\n<DOCUMENT_CONTENT>\n\n${optimizedContent}\n\n</DOCUMENT_CONTENT></DOCUMENT>`;

			this.logger.log(
				`Generating AI summary for YouTube video with ${optimizedContent.length} characters`,
			);
			const summaryChain = SUMMARY_PROMPT_TEMPLATE.pipe(llm);
			const summaryResult = await summaryChain.invoke({
				document: contentWithMetadata,
			});

			const summaryContent =
				typeof summaryResult === "string"
					? summaryResult
					: (summaryResult as { content?: string }).content ||
						String(summaryResult);

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

			this.logger.log("Generating embedding for document summary");
			const summaryEmbedding = await this.embeddingService.embed(
				enhancedSummaryContent,
			);

			return { summaryContent: enhancedSummaryContent, summaryEmbedding };
		} catch (error) {
			this.logger.error(
				`Failed to generate AI summary, falling back to simple summary: ${error.message}`,
			);

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

			const summaryEmbedding =
				await this.embeddingService.embed(summaryContent);

			return { summaryContent, summaryEmbedding };
		}
	}

	private async insertChunksWithEmbeddings(
		documentId: number,
		chunks: { content: string; embedding: number[] }[],
	): Promise<void> {
		for (const chunk of chunks) {
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
}
