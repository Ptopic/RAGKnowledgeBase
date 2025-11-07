/**
 * Stream connector search results to the client.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StreamConnectorSearchResultsParams {
  userQuery: string;
  userId: string;
  searchSpaceId: number;
  researchMode: string;
  selectedConnectors: string[];
  langchainChatHistory: any[];
  searchModeStr: string;
  documentIdsToAddInContext: number[];
  language?: string;
}

@Injectable()
export class StreamConnectorSearchResultsService {
  private readonly logger = new Logger(
    StreamConnectorSearchResultsService.name,
  );

  constructor(private prisma: PrismaService) {}

  /**
   * Stream connector search results to the client.
   *
   * This is an async generator that yields search results as they become available.
   * Typically implemented using Server-Sent Events (SSE) or WebSockets.
   *
   * @param params - Search parameters
   * @yields Formatted response strings
   */
  async *streamConnectorSearchResults(
    params: StreamConnectorSearchResultsParams,
  ): AsyncGenerator<string, void, unknown> {
    this.logger.log(
      `Starting connector search for user ${params.userId} in search space ${params.searchSpaceId}`,
    );

    try {
      // Convert search mode string to enum
      let searchMode: 'CHUNKS' | 'DOCUMENTS';
      if (params.searchModeStr === 'CHUNKS') {
        searchMode = 'CHUNKS';
      } else if (params.searchModeStr === 'DOCUMENTS') {
        searchMode = 'DOCUMENTS';
      } else {
        searchMode = 'CHUNKS'; // Default
      }

      // Sample configuration
      const config = {
        configurable: {
          user_query: params.userQuery,
          connectors_to_search: params.selectedConnectors,
          user_id: params.userId,
          search_space_id: params.searchSpaceId,
          search_mode: searchMode,
          document_ids_to_add_in_context: params.documentIdsToAddInContext,
          language: params.language,
        },
      };

      this.logger.debug(`Researcher configuration: ${JSON.stringify(config.configurable)}`);

      // Note: In the actual implementation, you would integrate with your
      // LangGraph researcher workflow here. This is a placeholder that shows
      // the structure.

      // Initialize state with database session and streaming service
      // const initialState = {
      //   db_session: this.prisma,
      //   streaming_service: streamingService,
      //   chat_history: params.langchainChatHistory,
      // };

      // Run the graph directly
      this.logger.log('Running the complete researcher workflow...');

      // Note: This is where you would stream results from your LangGraph workflow
      // For now, this is a placeholder implementation
      yield JSON.stringify({
        type: 'status',
        message: 'Starting search...',
      });

      // Example streaming implementation:
      // for await (const chunk of researcherGraph.astream(initialState, config)) {
      //   if (chunk && chunk.yieldValue) {
      //     yield chunk.yieldValue;
      //   }
      // }

      // Placeholder final result
      yield JSON.stringify({
        type: 'completion',
        message: 'Search completed',
      });
    } catch (error) {
      this.logger.error(
        `Error streaming connector search results: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
