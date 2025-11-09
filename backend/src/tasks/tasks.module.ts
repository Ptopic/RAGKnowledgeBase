/**
 * Tasks Module
 *
 * This module provides all background task processing functionality,
 * including document processors, connector indexers, and queue processors
 * using Bull queue system.
 */

import { BullModule } from "@nestjs/bull";
import { forwardRef, Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RetrieverModule } from "../retriever/retriever.module";
import { DeepgramService } from "../services/deepgram.service";
import { DoclingService } from "../services/docling.service";
import { LlamaCloudService } from "../services/llamacloud.service";
// Connector Indexers
import {
	ConnectorIndexerBaseService,
	GithubIndexerService,
	GoogleCalendarIndexerService,
	GoogleGmailIndexerService,
	NotionIndexerService,
	SlackIndexerService,
} from "./connector-indexers";
// Document Processors
import {
	DocumentProcessorBaseService,
	FileProcessorsService,
	MarkdownProcessorService,
	UrlCrawlerService,
	YoutubeProcessorService,
} from "./document-processors";

// Queue Processors
import {
	ConnectorTasksProcessor,
	DocumentTasksProcessor,
	ScheduleCheckerProcessor,
} from "./queue-tasks";

// Stream Service
import { StreamConnectorSearchResultsService } from "./stream-connector-search-results.service";

@Module({
	imports: [
		PrismaModule,
		RetrieverModule,
		forwardRef(() => AgentModule),
		// Register Bull queues
		BullModule.registerQueue(
			{
				name: "connector-tasks",
			},
			{
				name: "document-tasks",
			},
			{
				name: "schedule-checker",
			},
		),
	],
	providers: [
		// Document Processor Services
		DocumentProcessorBaseService,
		DeepgramService,
		DoclingService,
		LlamaCloudService,
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
		DeepgramService,
		DoclingService,
		LlamaCloudService,
		UrlCrawlerService,
		YoutubeProcessorService,
		MarkdownProcessorService,
		FileProcessorsService,

		// Export connector indexer services for use in other modules
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
