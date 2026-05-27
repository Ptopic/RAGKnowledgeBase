import { execFile } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType, Log } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";
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
import {
	YoutubeProcessingResult,
	YoutubeProcessingStrategy,
} from "./youtube-processing-strategy.interface";

const execFileAsync = promisify(execFile);

const YT_DLP_TIMEOUT_MS = 300000;
const WHISPER_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i;

@Injectable()
export class LocalYoutubeStrategy implements YoutubeProcessingStrategy {
	private readonly logger = new Logger(LocalYoutubeStrategy.name);
	private readonly textSplitter = createMarkdownAwareSplitter();

	constructor(
		private prisma: PrismaService,
		private embeddingService: EmbeddingService,
		private imageAnalysisService: ImageAnalysisService,
		private sseService: SseService,
	) {}

	async process(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	): Promise<YoutubeProcessingResult> {
		if (!process.env.OPENAI_API_KEY) {
			const errorMsg = "OPENAI_API_KEY is not set. Local YouTube processing requires it for Whisper transcription.";
			this.logger.error(errorMsg);

			await this.prisma.document.update({
				where: { id: documentId },
				data: { processingStatus: "FAILED", processingCompletedAt: new Date() },
			}).catch(() => {});

			this.sseService.broadcastEvent({
				topic: "documents",
				data: { action: "update", searchSpaceId, documentId },
			});

			return { success: false, error: errorMsg, documentId };
		}

		if (!YOUTUBE_URL_PATTERN.test(videoUrl)) {
			const errorMsg = `Invalid YouTube URL: ${videoUrl}`;
			this.logger.error(errorMsg);

			await this.prisma.document.update({
				where: { id: documentId },
				data: { processingStatus: "FAILED", processingCompletedAt: new Date() },
			}).catch(() => {});

			this.sseService.broadcastEvent({
				topic: "documents",
				data: { action: "update", searchSpaceId, documentId },
			});

			return { success: false, error: errorMsg, documentId };
		}

		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
			this.sseService,
		);

		let logEntry: Log | null = null;
		let audioFilePath: string | null = null;

		try {
			logEntry = await taskLogger.logTaskStart(
				"youtube_local_processing",
				"local",
				`Processing YouTube video locally: ${videoUrl}`,
				{ video_url: videoUrl, user_id: userId, document_id: documentId },
			);

			await taskLogger.logTaskProgress(
				logEntry,
				"Fetching video metadata with yt-dlp",
				{ stage: "metadata_fetch" },
			);

			const videoId = this.getYoutubeVideoId(videoUrl);
			if (!videoId) {
				throw new Error(`Could not extract video ID from URL: ${videoUrl}`);
			}

			const metadata = await this.fetchVideoMetadata(videoUrl);

			await taskLogger.logTaskProgress(
				logEntry,
				`Downloading audio for: ${metadata.title}`,
				{ stage: "audio_download", video_id: videoId },
			);

			audioFilePath = await this.downloadAudio(videoUrl);

			await taskLogger.logTaskProgress(
				logEntry,
				`Transcribing audio with Whisper for: ${metadata.title}`,
				{ stage: "transcription", video_id: videoId },
			);

			const transcript = await this.transcribeAudio(audioFilePath);

			await taskLogger.logTaskProgress(
				logEntry,
				`Processing transcript for: ${metadata.title}`,
				{ stage: "transcript_processing", video_id: videoId },
			);

			const combinedDocumentString = this.buildDocumentString(
				metadata.title,
				videoUrl,
				videoId,
				transcript,
			);

			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.YOUTUBE_VIDEO,
				videoId,
				searchSpaceId,
			);

			const contentHash = this.generateContentHash(
				combinedDocumentString,
				searchSpaceId,
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Checking for existing video: ${videoId}`,
				{ stage: "duplicate_check", video_id: videoId },
			);

			const existingDocument = await this.prisma.document.findUnique({
				where: { id: documentId },
			});

			if (existingDocument && existingDocument.contentHash === contentHash) {
				await taskLogger.logTaskSuccess(
					logEntry,
					`YouTube video document unchanged: ${metadata.title}`,
					{
						duplicate_detected: true,
						existing_document_id: existingDocument.id,
						video_id: videoId,
					},
				);
				this.logger.log(
					`Document for YouTube video ${videoId} unchanged. Skipping.`,
				);
				return { success: true, documentId: existingDocument.id };
			}

			await taskLogger.logTaskProgress(
				logEntry,
				`Generating summary for video: ${metadata.title}`,
				{ stage: "summary_generation" },
			);

			const documentMetadata = {
				url: videoUrl,
				video_id: videoId,
				title: metadata.title,
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
				`Processing content chunks for video: ${metadata.title}`,
				{ stage: "chunk_processing" },
			);

			const chunks = await this.createDocumentChunks(combinedDocumentString);

			await taskLogger.logTaskProgress(
				logEntry,
				`Updating YouTube video document in database: ${metadata.title}`,
				{ stage: "database_update", chunks_count: chunks.length },
			);

			await this.prisma.chunk.deleteMany({
				where: { documentId },
			});

			const updatedDocument = await this.prisma.document.update({
				where: { id: documentId },
				data: {
					title: metadata.title,
					content: summaryContent,
					contentHash,
					uniqueIdentifierHash,
					documentMetadata: {
						url: videoUrl,
						video_id: videoId,
						video_title: metadata.title,
					// biome-ignore lint/suspicious/noExplicitAny: Prisma documentMetadata accepts arbitrary shape
					} as any,
					processingStatus: "COMPLETED",
					processingCompletedAt: new Date(),
				},
				include: { chunks: true },
			});

			await this.updateDocumentEmbedding(updatedDocument.id, summaryEmbedding);
			await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);
			await this.enqueueImageAnalysisJob(
				updatedDocument.id,
				searchSpaceId,
				combinedDocumentString,
				"youtube",
			);

			this.sseService.broadcastEvent({
				topic: "documents",
				data: { action: "update", searchSpaceId, documentId: updatedDocument.id },
			});

			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully processed YouTube video locally: ${metadata.title}`,
				{
					document_id: updatedDocument.id,
					video_id: videoId,
					title: updatedDocument.title,
					content_hash: contentHash,
					chunks_count: chunks.length,
					summary_length: summaryContent.length,
				},
			);

			return { success: true, documentId: updatedDocument.id };
		} catch (error) {
			this.logger.error(
				`Failed to process YouTube video locally: ${error.message}`,
				error.stack,
			);

			try {
				await this.prisma.document.update({
					where: { id: documentId },
					data: {
						processingStatus: "FAILED",
						processingCompletedAt: new Date(),
					},
				});
			} catch (dbError) {
				this.logger.warn(
					`Failed to mark document ${documentId} as FAILED: ${dbError.message}`,
				);
			}

			this.sseService.broadcastEvent({
				topic: "documents",
				data: { action: "update", searchSpaceId, documentId },
			});

			if (logEntry) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to process YouTube video locally: ${videoUrl}`,
					error.message,
					{ error_type: error.name, video_url: videoUrl },
				);
			}

			return { success: false, error: error.message, documentId };
		} finally {
			if (audioFilePath) {
				try {
					fs.unlinkSync(audioFilePath);
				} catch (cleanupError) {
					this.logger.warn(
						`Failed to clean up temp audio file ${audioFilePath}: ${cleanupError.message}`,
					);
				}
			}
		}
	}

	private async fetchVideoMetadata(videoUrl: string): Promise<{
		title: string;
		description: string;
		duration: number;
		thumbnail: string;
		video_id: string;
		url: string;
	}> {
		try {
			const { stdout } = await execFileAsync("yt-dlp", [
				"--dump-json",
				"--no-playlist",
				videoUrl,
			], { timeout: YT_DLP_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

			const data = JSON.parse(stdout);

			return {
				title: data.title || "YouTube Video",
				description: data.description || "",
				duration: data.duration || 0,
				thumbnail: data.thumbnail || "",
				video_id: data.id || this.getYoutubeVideoId(videoUrl) || "",
				url: data.webpage_url || videoUrl,
			};
		} catch (error) {
			if (error.code === "ENOENT") {
				throw new Error(
					"yt-dlp is not installed. Please install it to use local YouTube processing: https://github.com/yt-dlp/yt-dlp",
				);
			}
			throw new Error(`Failed to fetch video metadata with yt-dlp: ${error.message}`);
		}
	}

	private async downloadAudio(videoUrl: string): Promise<string> {
		const tempId = crypto.randomUUID();
		const outputPath = `/tmp/${tempId}.opus`;

		try {
			await execFileAsync("yt-dlp", [
				"--no-playlist",
				"-x",
				"--audio-format",
				"opus",
				"-o",
				outputPath,
				videoUrl,
			], { timeout: YT_DLP_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

			if (!fs.existsSync(outputPath)) {
				throw new Error("Audio file was not created after yt-dlp download");
			}

			return outputPath;
		} catch (error) {
			if (error.code === "ENOENT") {
				throw new Error(
					"yt-dlp is not installed. Please install it to use local YouTube processing: https://github.com/yt-dlp/yt-dlp",
				);
			}
			if (error.message?.includes("ffmpeg")) {
				throw new Error(
					"ffmpeg is not installed. It is required for audio extraction by yt-dlp. Please install ffmpeg.",
				);
			}
			throw new Error(`Failed to download audio with yt-dlp: ${error.message}`);
		}
	}

	private async transcribeAudio(audioFilePath: string): Promise<string> {
		try {
			const fileStats = fs.statSync(audioFilePath);
			if (fileStats.size > WHISPER_MAX_FILE_SIZE_BYTES) {
				throw new Error(
					`Audio file exceeds Whisper API 25MB limit (${(fileStats.size / 1024 / 1024).toFixed(1)}MB). Consider using a shorter video or the BrightData processor.`,
				);
			}

			const formData = new FormData();
			formData.append("file", fs.createReadStream(audioFilePath), {
				filename: path.basename(audioFilePath),
			});
			formData.append("model", "whisper-1");
			formData.append("response_format", "text");

			const response = await axios.post(
				"https://api.openai.com/v1/audio/transcriptions",
				formData,
				{
					headers: {
						...formData.getHeaders(),
						Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
					},
					maxContentLength: Infinity,
					maxBodyLength: Infinity,
				},
			);

			const transcript = typeof response.data === "string"
				? response.data
				: response.data?.text || "";

			if (!transcript.trim()) {
				throw new Error("Whisper returned an empty transcript");
			}

			return transcript;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const status = error.response?.status;
				const message = error.response?.data?.error?.message || error.message;
				throw new Error(
					`Whisper API transcription failed (HTTP ${status}): ${message}`,
				);
			}
			throw new Error(`Failed to transcribe audio: ${error.message}`);
		}
	}

	private buildDocumentString(
		title: string,
		url: string,
		videoId: string,
		transcript: string,
	): string {
		const metadataSections: [string, string[]][] = [
			[
				"METADATA",
				[`TITLE: ${title}`, `URL: ${url}`, `VIDEO_ID: ${videoId}`],
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
		return documentParts.join("\n");
	}

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
