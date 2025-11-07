/**
 * Stream connector search results to the client.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { PrismaService } from '../prisma/prisma.service';

interface StreamConnectorSearchResultsParams {
  userQuery: string;
  userId: string;
  searchSpaceId: number;
  researchMode: string;
  selectedConnectors: string[];
  langchainChatHistory: Array<{ role: string; content: string }>;
  searchModeStr: string;
  documentIdsToAddInContext: number[];
  language?: string;
}

@Injectable()
export class StreamConnectorSearchResultsService {
  private readonly logger = new Logger(
    StreamConnectorSearchResultsService.name,
  );

  constructor(
    private prisma: PrismaService,
    private agentService: AgentService,
  ) {}

  /**
   * Format data for AI SDK data stream protocol
   * Format: 0:"text content"\n
   */
  private formatDataStreamChunk(text: string): string {
    // Escape quotes and newlines in the text
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `0:"${escaped}"\n`;
  }

  /**
   * Format finish message for AI SDK data stream protocol
   */
  private formatFinishChunk(): string {
    return 'd:{"finishReason":"stop"}\n';
  }

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

      // Call the agent service with the user query
      const chatDto = {
        message: params.userQuery,
        thread_id: `${params.userId}_${params.searchSpaceId}`,
      };

      // Stream from agent service and convert to AI SDK format
      const stream = this.agentService.streamChat(chatDto);

      // Convert Observable to async generator
      const chunks: string[] = [];
      let streamError: Error | null = null;
      let streamComplete = false;

      // Subscribe to the stream and collect chunks
      stream.subscribe({
        next: (chunk) => {
          if (chunk && chunk.length > 0) {
            chunks.push(chunk);
          }
        },
        error: (error) => {
          this.logger.error(`Stream error: ${error.message}`);
          streamError = error;
          streamComplete = true;
        },
        complete: () => {
          this.logger.log('Agent stream completed');
          streamComplete = true;
        },
      });

      // Yield chunks as they arrive
      while (!streamComplete) {
        if (chunks.length > 0) {
          const chunk = chunks.shift();
          if (chunk) {
            // Format the chunk for AI SDK
            yield this.formatDataStreamChunk(chunk);
          }
        } else {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Yield any remaining chunks
      while (chunks.length > 0) {
        const chunk = chunks.shift();
        if (chunk) {
          yield this.formatDataStreamChunk(chunk);
        }
      }

      // If there was an error, throw it
      if (streamError) {
        throw streamError;
      }

      // Send finish chunk
      yield this.formatFinishChunk();
    } catch (error) {
      this.logger.error(
        `Error streaming connector search results: ${error.message}`,
        error.stack,
      );
      // Send error in AI SDK format
      yield this.formatDataStreamChunk(`Error: ${error.message}`);
      yield this.formatFinishChunk();
    }
  }
}
