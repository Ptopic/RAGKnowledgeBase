/**
 * Bull queue processors for document processing tasks.
 */

import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import {
	FileProcessorsService,
	UrlCrawlerService,
	YoutubeProcessorService,
} from "../document-processors";

interface UrlTaskData {
	url: string;
	searchSpaceId: number;
	userId: string;
}

interface FileTaskData {
	filePath: string;
	filename: string;
	searchSpaceId: number;
	userId: string;
}

@Processor("document-tasks")
export class DocumentTasksProcessor {
	private readonly logger = new Logger(DocumentTasksProcessor.name);

	constructor(
		private urlCrawler: UrlCrawlerService,
		private youtubeProcessor: YoutubeProcessorService,
		private fileProcessors: FileProcessorsService,
	) {}

	/**
	 * Process crawled URL task.
	 */
	@Process("process_crawled_url")
	async processCrawledUrl(job: Job<UrlTaskData>) {
		this.logger.log(
			`Processing crawled URL job ${job.id} for URL: ${job.data.url}`,
		);

		try {
			const result = await this.urlCrawler.addCrawledUrlDocument(
				job.data.url,
				job.data.searchSpaceId,
				job.data.userId,
			);

			if (result) {
				this.logger.log(
					`Successfully crawled and processed URL: ${job.data.url}`,
				);
			} else {
				this.logger.log(
					`URL document already exists (duplicate): ${job.data.url}`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Failed to crawl URL job ${job.id}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Process YouTube video task using BrightData webhook approach.
	 */
	@Process("process_youtube_video")
	async processYoutubeVideo(job: Job<UrlTaskData>) {
		this.logger.log(
			`Processing YouTube video job ${job.id} for URL: ${job.data.url}`,
		);

		try {
			// Trigger BrightData webhook scrape
			const snapshotId = await this.youtubeProcessor.triggerYoutubeVideoScrape(
				job.data.url,
				job.data.searchSpaceId,
				job.data.userId,
			);

			this.logger.log(
				`BrightData scrape triggered for ${job.data.url}. Snapshot ID: ${snapshotId}. Webhook will process results.`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to trigger BrightData scrape for job ${job.id}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Process file upload task.
	 */
	@Process("process_file_upload")
	async processFileUpload(job: Job<FileTaskData>) {
		this.logger.log(
			`Processing file upload job ${job.id} for file: ${job.data.filename}`,
		);

		try {
			await this.fileProcessors.processFileInBackground(
				job.data.filePath,
				job.data.filename,
				job.data.searchSpaceId,
				job.data.userId,
			);

			this.logger.log(`Successfully processed file: ${job.data.filename}`);
		} catch (error) {
			this.logger.error(
				`Failed to process file upload job ${job.id}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
