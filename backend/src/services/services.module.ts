import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RetrieverModule } from '../retriever/retriever.module';
import { LLMService } from './llm.service';
import { StreamingService } from './streaming.service';
import { QueryService } from './query.service';
import { RerankerService } from './reranker.service';
import { PageLimitService } from './page-limit.service';
import { DoclingService } from './docling.service';
import { STTService } from './stt.service';
import { JinaReaderService } from './jina-reader.service';
import { CrawleeImpitFallbackService } from './crawlee-impit-fallback.service';

/**
 * Global Services Module
 *
 * This module exports all core services that are used across the application.
 * It's marked as Global so services can be injected anywhere without importing the module.
 */
@Global()
@Module({
	imports: [PrismaModule, RetrieverModule],
	providers: [
		LLMService,
		StreamingService,
		QueryService,
		RerankerService,
		PageLimitService,
		DoclingService,
		STTService,
		JinaReaderService,
		CrawleeImpitFallbackService,
	],
	exports: [
		LLMService,
		StreamingService,
		QueryService,
		RerankerService,
		PageLimitService,
		DoclingService,
		STTService,
		JinaReaderService,
		CrawleeImpitFallbackService,
	],
})
export class ServicesModule {}
