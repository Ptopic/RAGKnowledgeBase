import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PrismaService } from "src/prisma/prisma.service";
import {
	FileProcessorsService,
	UrlCrawlerService,
	YoutubeProcessorService,
} from "src/tasks/document-processors";
import { QUEUE_NAMES } from "../queue.config";

/**
 * Document Processing Processor
 *
 * Handles asynchronous processing of documents:
 * - URL documents (web scraping)
 * - YouTube video documents (via BrightData webhook)
 * - File uploads
 */
@Processor(QUEUE_NAMES.DOCUMENTS)
export class DocumentsProcessor {
	private readonly logger = new Logger(DocumentsProcessor.name);

	constructor(
		private prisma: PrismaService,
		private fileProcessorsService: FileProcessorsService,
		private urlCrawlerService: UrlCrawlerService,
		private youtubeProcessorService: YoutubeProcessorService,
	) {}

	/**
	 * Process URL document (web scraping)
	 */
	@Process("process-url-document")
	async processUrlDocument(
		job: Job<{
			url: string;
			searchSpaceId: number;
			userId: string;
			documentId: number;
		}>,
	) {
		const { url, searchSpaceId, userId, documentId } = job.data;

		try {
			this.logger.log(
				`Processing URL document: ${url} for search space ${searchSpaceId}`,
			);

			await this.urlCrawlerService.addCrawledUrlDocument(
				url,
				searchSpaceId,
				userId,
				documentId,
			);

			this.logger.log(`Successfully processed URL document: ${url}`);
		} catch (error) {
			this.logger.error(
				`Failed to process URL document ${url}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	@Process("process-youtube-document")
	async processYouTubeDocument(
		job: Job<{
			videoUrl: string;
			searchSpaceId: number;
			userId: string;
			documentId: number;
		}>,
	) {
		const { videoUrl, searchSpaceId, userId, documentId } = job.data;

		try {
			this.logger.log(
				`Processing YouTube video: ${videoUrl} (search space ${searchSpaceId})`,
			);

			const result = await this.youtubeProcessorService.process(
				videoUrl,
				searchSpaceId,
				userId,
				documentId,
			);

			if (!result.success) {
				throw new Error(result.error || "YouTube processing failed");
			}

			this.logger.log(
				`YouTube video processing initiated for ${videoUrl}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to process YouTube video ${videoUrl}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Process file upload document
	 * Handles PDF, DOCX, TXT, etc.
	 */
	@Process("process-file-document")
	async processFileDocument(
		job: Job<{
			filePath: string;
			fileName: string;
			searchSpaceId: number;
			userId: string;
			documentId: number;
		}>,
	) {
		const { filePath, fileName, searchSpaceId, userId, documentId } = job.data;

		try {
			this.logger.log(
				`Processing file document: ${fileName} for search space ${searchSpaceId}`,
			);

			await this.fileProcessorsService.processFileInBackground(
				filePath,
				fileName,
				searchSpaceId,
				userId,
				documentId,
			);

			this.logger.log(`Successfully processed file document: ${fileName}`);
		} catch (error) {
			this.logger.error(
				`Failed to process file document ${fileName}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
