import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PrismaService } from "src/prisma/prisma.service";
import { GithubIndexerService } from "src/tasks/connector-indexers/github-indexer.service";
import { GoogleCalendarIndexerService } from "src/tasks/connector-indexers/google-calendar-indexer.service";
import { GoogleGmailIndexerService } from "src/tasks/connector-indexers/google-gmail-indexer.service";
import { NotionIndexerService } from "src/tasks/connector-indexers/notion-indexer.service";
import { SlackIndexerService } from "src/tasks/connector-indexers/slack-indexer.service";
import { toDateString } from "src/utils/date-utils";
import { QUEUE_NAMES } from "../queue.config";

/**
 * Connector Indexing Processor
 *
 * Handles indexing from third-party connectors:
 * - Slack, Notion, GitHub, Google Calendar, Google Gmail
 */
@Processor(QUEUE_NAMES.CONNECTORS)
export class ConnectorsProcessor {
	private readonly logger = new Logger(ConnectorsProcessor.name);

	constructor(
		// biome-ignore lint/correctness/noUnusedPrivateClassMembers: PrismaService may be used for future database operations
		private prisma: PrismaService,
		private slackIndexer: SlackIndexerService,
		private notionIndexer: NotionIndexerService,
		private githubIndexer: GithubIndexerService,
		private googleCalendarIndexer: GoogleCalendarIndexerService,
		private googleGmailIndexer: GoogleGmailIndexerService,
	) {}

	/**
	 * Index Slack messages
	 */
	@Process("index-slack-messages")
	async indexSlackMessages(
		job: Job<{
			connectorId: number;
			searchSpaceId: number;
			userId: string;
			startDate?: Date;
			endDate?: Date;
		}>,
	) {
		const { connectorId, searchSpaceId, userId, startDate, endDate } = job.data;

		try {
			this.logger.log(`Indexing Slack messages for connector ${connectorId}`);

			// Convert Date objects to string format (YYYY-MM-DD) if provided
			const startDateStr = toDateString(startDate);
			const endDateStr = toDateString(endDate);

			await this.slackIndexer.indexSlackMessages(
				connectorId,
				searchSpaceId,
				userId,
				startDateStr,
				endDateStr,
			);

			this.logger.log(
				`Successfully indexed Slack messages for connector ${connectorId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index Slack messages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Index Notion pages
	 */
	@Process("index-notion-pages")
	async indexNotionPages(
		job: Job<{
			connectorId: number;
			searchSpaceId: number;
			userId: string;
			startDate?: Date;
			endDate?: Date;
		}>,
	) {
		const { connectorId, searchSpaceId, userId } = job.data;

		try {
			this.logger.log(`Indexing Notion pages for connector ${connectorId}`);

			await this.notionIndexer.indexNotionPages(
				connectorId,
				searchSpaceId,
				userId,
			);

			this.logger.log(
				`Successfully indexed Notion pages for connector ${connectorId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index Notion pages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Index GitHub repositories
	 */
	@Process("index-github-repos")
	async indexGitHubRepos(
		job: Job<{
			connectorId: number;
			searchSpaceId: number;
			userId: string;
			startDate?: Date;
			endDate?: Date;
		}>,
	) {
		const { connectorId, searchSpaceId, userId, startDate, endDate } = job.data;

		try {
			this.logger.log(`Indexing GitHub repos for connector ${connectorId}`);

			// Convert Date objects to string format (YYYY-MM-DD) if provided
			const startDateStr = toDateString(startDate);
			const endDateStr = toDateString(endDate);

			await this.githubIndexer.indexGithubRepos(
				connectorId,
				searchSpaceId,
				userId,
				startDateStr,
				endDateStr,
			);

			this.logger.log(
				`Successfully indexed GitHub repos for connector ${connectorId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index GitHub repos: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Index Google Calendar events
	 */
	@Process("index-google-calendar-events")
	async indexGoogleCalendarEvents(
		job: Job<{
			connectorId: number;
			searchSpaceId: number;
			userId: string;
			startDate?: Date;
			endDate?: Date;
		}>,
	) {
		const { connectorId, searchSpaceId, userId, startDate, endDate } = job.data;

		try {
			this.logger.log(
				`Indexing Google Calendar events for connector ${connectorId}`,
			);

			// Convert Date objects to string format (YYYY-MM-DD) if provided
			const startDateStr = toDateString(startDate);
			const endDateStr = toDateString(endDate);

			await this.googleCalendarIndexer.indexGoogleCalendarEvents(
				connectorId,
				searchSpaceId,
				userId,
				startDateStr,
				endDateStr,
			);

			this.logger.log(
				`Successfully indexed Google Calendar events for connector ${connectorId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index Google Calendar events: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Index Google Gmail messages
	 */
	@Process("index-google-gmail-messages")
	async indexGoogleGmailMessages(
		job: Job<{
			connectorId: number;
			searchSpaceId: number;
			userId: string;
			startDate?: Date;
			endDate?: Date;
		}>,
	) {
		const { connectorId, searchSpaceId, userId, startDate, endDate } = job.data;

		try {
			this.logger.log(
				`Indexing Google Gmail messages for connector ${connectorId}`,
			);

			// Convert Date objects to string format (YYYY-MM-DD) if provided
			const startDateStr = toDateString(startDate);
			const endDateStr = toDateString(endDate);

			await this.googleGmailIndexer.indexGoogleGmailMessages(
				connectorId,
				searchSpaceId,
				userId,
				startDateStr,
				endDateStr,
			);

			this.logger.log(
				`Successfully indexed Google Gmail messages for connector ${connectorId}`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to index Google Gmail messages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
