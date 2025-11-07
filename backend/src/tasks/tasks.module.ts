/**
 * Tasks Module
 *
 * This module provides all background task processing functionality,
 * including document processors, connector indexers, and queue processors
 * using Bull queue system.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';

// Document Processors
import {
  DocumentProcessorBaseService,
  ExtensionProcessorService,
  UrlCrawlerService,
  YoutubeProcessorService,
  MarkdownProcessorService,
  FileProcessorsService,
} from './document-processors';

// Connector Indexers
import {
  ConnectorIndexerBaseService,
  GithubIndexerService,
  GoogleCalendarIndexerService,
  GoogleGmailIndexerService,
  NotionIndexerService,
  SlackIndexerService,
} from './connector-indexers';

// Queue Processors
import {
  ConnectorTasksProcessor,
  DocumentTasksProcessor,
  ScheduleCheckerProcessor,
} from './queue-tasks';

// Stream Service
import { StreamConnectorSearchResultsService } from './stream-connector-search-results.service';

@Module({
  imports: [
    PrismaModule,
    // Register Bull queues
    BullModule.registerQueue(
      {
        name: 'connector-tasks',
      },
      {
        name: 'document-tasks',
      },
      {
        name: 'schedule-checker',
      },
    ),
  ],
  providers: [
    // Document Processor Services
    DocumentProcessorBaseService,
    ExtensionProcessorService,
    UrlCrawlerService,
    YoutubeProcessorService,
    MarkdownProcessorService,
    FileProcessorsService,

    // Connector Indexer Services
    ConnectorIndexerBaseService,
    GithubIndexerService,
    GoogleCalendarIndexerService,
    GoogleGmailIndexerService,
    NotionIndexerService,
    SlackIndexerService,

    // Queue Processors
    ConnectorTasksProcessor,
    DocumentTasksProcessor,
    ScheduleCheckerProcessor,

    // Stream Service
    StreamConnectorSearchResultsService,
  ],
  exports: [
    // Export document processors for use in other modules
    DocumentProcessorBaseService,
    ExtensionProcessorService,
    UrlCrawlerService,
    YoutubeProcessorService,
    MarkdownProcessorService,
    FileProcessorsService,

    // Export connector indexers for use in other modules
    ConnectorIndexerBaseService,
    GithubIndexerService,
    GoogleCalendarIndexerService,
    GoogleGmailIndexerService,
    NotionIndexerService,
    SlackIndexerService,

    // Export stream service
    StreamConnectorSearchResultsService,
  ],
})
export class TasksModule {}
