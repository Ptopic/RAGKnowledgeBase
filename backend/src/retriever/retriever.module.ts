import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppConfigModule } from '../config/config.module';
import { ChunksHybridSearchRetriever } from './chunks-hybrid-search.retriever';
import { DocumentHybridSearchRetriever } from './documents-hybrid-search.retriever';
import { EmbeddingService } from './embedding.service';
import { RetrieverService } from './retriever.service';

/**
 * Module that provides hybrid search retrieval functionality.
 * Exports both individual retrievers and a unified service.
 */
@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [
    EmbeddingService,
    ChunksHybridSearchRetriever,
    DocumentHybridSearchRetriever,
    RetrieverService,
  ],
  exports: [
    EmbeddingService,
    ChunksHybridSearchRetriever,
    DocumentHybridSearchRetriever,
    RetrieverService,
  ],
})
export class RetrieverModule {}

