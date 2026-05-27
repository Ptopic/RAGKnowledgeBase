import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bull";
import { parseScheduleInterval, QUEUE_NAMES } from "./queue.config";

/**
 * Queue Service
 * Provides methods to add jobs to Bull queues
 */
@Injectable()
export class QueueService implements OnModuleInit {
	private readonly logger = new Logger(QueueService.name);

	constructor(
		@InjectQueue(QUEUE_NAMES.DOCUMENTS)
		private documentsQueue: Queue,
		@InjectQueue(QUEUE_NAMES.CONNECTORS)
		private connectorsQueue: Queue,
		@InjectQueue(QUEUE_NAMES.SCHEDULER)
		private schedulerQueue: Queue,
	) {}

	async onModuleInit() {
		await this.setupScheduleChecker();
	}

	/**
	 * Set up the periodic schedule checker
	 */
	private async setupScheduleChecker() {
		try {
			const interval = process.env.SCHEDULE_CHECKER_INTERVAL || "2m";
			const cronExpression = parseScheduleInterval(interval);

			await this.schedulerQueue.add(
				"check-periodic-schedules",
				{},
				{
					repeat: {
						cron: cronExpression,
					},
					jobId: "periodic-schedule-checker",
				},
			);

			this.logger.log(
				`Schedule checker configured to run with interval: ${interval} (cron: ${cronExpression})`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to set up schedule checker: ${error.message}`,
				error.stack,
			);
		}
	}

	// ==================== Document Queue Methods ====================

	/**
	 * Add URL document processing job
	 */
	async processUrlDocument(url: string, searchSpaceId: number, userId: string, documentId: number) {
		return this.documentsQueue.add("process-url-document", {
			url,
			searchSpaceId,
			userId,
			documentId,
		});
	}

	/**
	 * Add YouTube document processing job
	 */
	async processYouTubeDocument(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	) {
		return this.documentsQueue.add("process-youtube-document", {
			videoUrl,
			searchSpaceId,
			userId,
			documentId,
		});
	}

	/**
	 * Add file document processing job
	 */
	async processFileDocument(
		filePath: string,
		fileName: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	) {
		return this.documentsQueue.add("process-file-document", {
			filePath,
			fileName,
			searchSpaceId,
			userId,
			documentId,
		});
	}

	// ==================== Connector Queue Methods ====================

	/**
	 * Index Slack messages
	 */
	async indexSlackMessages(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		return this.connectorsQueue.add("index-slack-messages", {
			connectorId,
			searchSpaceId,
			userId,
			startDate,
			endDate,
		});
	}

	/**
	 * Index Notion pages
	 */
	async indexNotionPages(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		return this.connectorsQueue.add("index-notion-pages", {
			connectorId,
			searchSpaceId,
			userId,
			startDate,
			endDate,
		});
	}

	/**
	 * Index GitHub repositories
	 */
	async indexGitHubRepos(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		return this.connectorsQueue.add("index-github-repos", {
			connectorId,
			searchSpaceId,
			userId,
			startDate,
			endDate,
		});
	}

	/**
	 * Index Google Calendar events
	 */
	async indexGoogleCalendarEvents(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		return this.connectorsQueue.add("index-google-calendar-events", {
			connectorId,
			searchSpaceId,
			userId,
			startDate,
			endDate,
		});
	}

	/**
	 * Index Google Gmail messages
	 */
	async indexGoogleGmailMessages(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		return this.connectorsQueue.add("index-google-gmail-messages", {
			connectorId,
			searchSpaceId,
			userId,
			startDate,
			endDate,
		});
	}

	// ==================== Queue Management Methods ====================

	/**
	 * Get job status
	 */
	async getJobStatus(queueName: string, jobId: string) {
		const queue = this.getQueue(queueName);
		if (!queue) {
			throw new Error(`Queue ${queueName} not found`);
		}
		return queue.getJob(jobId);
	}

	/**
	 * Remove job
	 */
	async removeJob(queueName: string, jobId: string) {
		const queue = this.getQueue(queueName);
		if (!queue) {
			throw new Error(`Queue ${queueName} not found`);
		}
		const job = await queue.getJob(jobId);
		if (job) {
			await job.remove();
		}
	}

	private getQueue(queueName: string): Queue | null {
		switch (queueName) {
			case QUEUE_NAMES.DOCUMENTS:
				return this.documentsQueue;
			case QUEUE_NAMES.CONNECTORS:
				return this.connectorsQueue;
			case QUEUE_NAMES.SCHEDULER:
				return this.schedulerQueue;
			default:
				return null;
		}
	}
}
