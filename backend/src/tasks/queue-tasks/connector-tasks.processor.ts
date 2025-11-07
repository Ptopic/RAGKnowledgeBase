/**
 * Bull queue processors for connector indexing tasks.
 */

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  GithubIndexerService,
  SlackIndexerService,
  NotionIndexerService,
  GoogleCalendarIndexerService,
  GoogleGmailIndexerService,
} from '../connector-indexers';

interface ConnectorTaskData {
  connectorId: number;
  searchSpaceId: number;
  userId: string;
  startDate?: string;
  endDate?: string;
}

@Processor('connector-tasks')
export class ConnectorTasksProcessor {
  private readonly logger = new Logger(ConnectorTasksProcessor.name);

  constructor(
    private slackIndexer: SlackIndexerService,
    private notionIndexer: NotionIndexerService,
    private githubIndexer: GithubIndexerService,
    private googleCalendarIndexer: GoogleCalendarIndexerService,
    private googleGmailIndexer: GoogleGmailIndexerService,
  ) {}

  /**
   * Process Slack message indexing task.
   */
  @Process('index_slack_messages')
  async indexSlackMessages(job: Job<ConnectorTaskData>) {
    this.logger.log(
      `Processing Slack indexing job ${job.id} for connector ${job.data.connectorId}`,
    );

    try {
      await this.slackIndexer.indexSlackMessages(
        job.data.connectorId,
        job.data.searchSpaceId,
        job.data.userId,
        job.data.startDate,
        job.data.endDate,
      );

      this.logger.log(
        `Successfully completed Slack indexing job ${job.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Slack indexing job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process Notion pages indexing task.
   */
  @Process('index_notion_pages')
  async indexNotionPages(job: Job<ConnectorTaskData>) {
    this.logger.log(
      `Processing Notion indexing job ${job.id} for connector ${job.data.connectorId}`,
    );

    try {
      await this.notionIndexer.indexNotionPages(
        job.data.connectorId,
        job.data.searchSpaceId,
        job.data.userId,
        job.data.startDate,
        job.data.endDate,
      );

      this.logger.log(
        `Successfully completed Notion indexing job ${job.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Notion indexing job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process GitHub repositories indexing task.
   */
  @Process('index_github_repos')
  async indexGithubRepos(job: Job<ConnectorTaskData>) {
    this.logger.log(
      `Processing GitHub indexing job ${job.id} for connector ${job.data.connectorId}`,
    );

    try {
      await this.githubIndexer.indexGithubRepos(
        job.data.connectorId,
        job.data.searchSpaceId,
        job.data.userId,
        job.data.startDate,
        job.data.endDate,
      );

      this.logger.log(
        `Successfully completed GitHub indexing job ${job.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process GitHub indexing job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process Google Calendar events indexing task.
   */
  @Process('index_google_calendar_events')
  async indexGoogleCalendarEvents(job: Job<ConnectorTaskData>) {
    this.logger.log(
      `Processing Google Calendar indexing job ${job.id} for connector ${job.data.connectorId}`,
    );

    try {
      await this.googleCalendarIndexer.indexGoogleCalendarEvents(
        job.data.connectorId,
        job.data.searchSpaceId,
        job.data.userId,
        job.data.startDate,
        job.data.endDate,
      );

      this.logger.log(
        `Successfully completed Google Calendar indexing job ${job.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Google Calendar indexing job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process Google Gmail messages indexing task.
   */
  @Process('index_google_gmail_messages')
  async indexGoogleGmailMessages(job: Job<ConnectorTaskData>) {
    this.logger.log(
      `Processing Google Gmail indexing job ${job.id} for connector ${job.data.connectorId}`,
    );

    try {
      await this.googleGmailIndexer.indexGoogleGmailMessages(
        job.data.connectorId,
        job.data.searchSpaceId,
        job.data.userId,
        job.data.startDate,
        job.data.endDate,
      );

      this.logger.log(
        `Successfully completed Google Gmail indexing job ${job.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Google Gmail indexing job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
