import { Injectable } from '@nestjs/common';
import { ChunksHybridSearchRetriever } from './chunks-hybrid-search.retriever';
import { DocumentHybridSearchRetriever } from './documents-hybrid-search.retriever';
import {
   ChunkSearchResult,
   DocumentSearchResult,
   SearchOptions,
} from './interfaces/retriever.interface';

/**
 * Service that provides access to both chunk and document hybrid search retrievers.
 */
@Injectable()
export class RetrieverService {
  constructor(
    private readonly chunksRetriever: ChunksHybridSearchRetriever,
    private readonly documentsRetriever: DocumentHybridSearchRetriever,
  ) {}

  /**
   * Perform hybrid search on chunks.
   */
  async searchChunks(options: SearchOptions): Promise<ChunkSearchResult[]> {
    return this.chunksRetriever.hybridSearch(options);
  }

  /**
   * Perform vector search on chunks.
   */
  async searchChunksVector(options: SearchOptions): Promise<any[]> {
    return this.chunksRetriever.vectorSearch(options);
  }

  /**
   * Perform full-text search on chunks.
   */
  async searchChunksFullText(options: SearchOptions): Promise<any[]> {
    return this.chunksRetriever.fullTextSearch(options);
  }

  /**
   * Perform hybrid search on documents (returns individual chunks).
   */
  async searchDocuments(options: SearchOptions): Promise<DocumentSearchResult[]> {
    return this.documentsRetriever.hybridSearch(options);
  }

  /**
   * Perform vector search on documents.
   */
  async searchDocumentsVector(options: SearchOptions): Promise<any[]> {
    return this.documentsRetriever.vectorSearch(options);
  }

  /**
   * Perform full-text search on documents.
   */
  async searchDocumentsFullText(options: SearchOptions): Promise<any[]> {
    return this.documentsRetriever.fullTextSearch(options);
  }

  /**
   * Get the chunks retriever instance.
   */
  getChunksRetriever(): ChunksHybridSearchRetriever {
    return this.chunksRetriever;
  }

  /**
   * Get the documents retriever instance.
   */
  getDocumentsRetriever(): DocumentHybridSearchRetriever {
    return this.documentsRetriever;
  }
}

