import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Injectable, Logger } from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { ChatsService } from "src/chats/chats.service";
import { SearchMode } from "src/services";
import { YoutubeProcessorService } from "../tasks/document-processors";
import { ResearcherService } from "./researcher.service";
import { ConversationMemoryService } from "./services";
import { LLMService } from "./services/llm.service";

interface StreamConnectorSearchResultsParams {
	userQuery: string;
	userId: string;
	searchSpaceId: number;
	researchMode: string;
	selectedConnectors: string[];
	searchModeStr: string;
	documentIdsToAddInContext: number[];
	language?: string;
	chatId?: number;
	creditHandler?: BaseCallbackHandler;
}

@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);

	constructor(
		private readonly researcherService: ResearcherService,
		private readonly youtubeProcessorService: YoutubeProcessorService,
		private readonly chatsService: ChatsService,
		private readonly conversationMemoryService: ConversationMemoryService,
		private readonly llmService: LLMService,
	) {}

	/**
	 * Stream connector search results to the client.
	 *
	 * Returns a Response object with text/event-stream for LangChain SDK compatibility.
	 *
	 * @param params - Search parameters
	 * @returns Response with streaming data
	 */
	async streamConnectorSearchResults(
		params: StreamConnectorSearchResultsParams,
	): Promise<{
		stream: any;
		chatId?: number;
		chatWasCreated: boolean;
		billedToUserKey: boolean;
	}> {
		let currentChatId = params.chatId;
		let chatWasCreated = false;

		// Auto-create chat if no chatId provided
		if (!currentChatId) {
			const chatTitleSummary = params.userQuery.substring(0, 50);
			const newChat = await this.chatsService.create(
				{
					type: ChatType.QNA,
					title: chatTitleSummary,
					initial_connectors: params.selectedConnectors,
					messages: [],
					search_space_id: params.searchSpaceId,
				},
				params.userId,
			);
			currentChatId = newChat.id;
			chatWasCreated = true;
		}

		let recentMessages: Array<{ role: string; content: string }> = [];
		if (currentChatId) {
			recentMessages = await this.conversationMemoryService.getRecentMessages(
				currentChatId,
				params.userId,
				10,
			);
		}

		try {
			let searchMode: SearchMode;
			if (params.searchModeStr === "CHUNKS") {
				searchMode = SearchMode.CHUNKS;
			} else if (params.searchModeStr === "DOCUMENTS") {
				searchMode = SearchMode.DOCUMENTS;
			} else {
				searchMode = SearchMode.CHUNKS;
			}

			// TODO: Check if thread id works
			const persistentThreadId = currentChatId
				? `chat-${currentChatId}`
				: `${params.userId}_${params.searchSpaceId}`;

			const researcherDto = {
				user_query: params.userQuery,
				connectors_to_search: params.selectedConnectors,
				user_id: params.userId,
				search_space_id: parseInt(String(params.searchSpaceId)),
				search_mode: searchMode,
				document_ids_to_add_in_context: params.documentIdsToAddInContext,
				language: params.language,
				thread_id: persistentThreadId,
				chat_history: recentMessages,
			};

			const stream = await this.researcherService.streamResearcher(
				researcherDto,
				params.creditHandler,
			);

			// If the user has no LLM config of their own, the researcher
			// falls back to the platform key (env OPENAI_API_KEY) and
			// the platform eats the cost.
			const userLlm = await this.llmService.getUserFastLLM(
				params.userId,
				params.searchSpaceId,
			);

			return {
				stream,
				chatId: currentChatId,
				chatWasCreated,
				billedToUserKey: userLlm !== null,
			};
		} catch (error) {
			this.logger.error(
				`Error streaming connector search results: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Process BrightData webhook response for YouTube transcript
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies
	async processBrightDataWebhook(
		webhookData: any,
		context: {
			searchSpaceId: number | null;
			userId: string | undefined;
			videoUrl: string | undefined;
			documentId?: number;
		},
	): Promise<void> {
		try {
			this.logger.log("Processing BrightData webhook data");

			if (
				!webhookData ||
				!Array.isArray(webhookData) ||
				webhookData.length === 0
			) {
				this.logger.warn("Empty or invalid webhook data received");
				return;
			}

			if (!context.searchSpaceId || !context.userId || !context.videoUrl) {
				this.logger.error(
					"Missing required context in webhook URL query parameters",
					context,
				);
				throw new Error(
					"Missing required context (searchSpaceId, userId, videoUrl) in webhook URL",
				);
			}

			for (const result of webhookData) {
				const { transcript, video_id, title, url } = result;

				if (!transcript || !video_id) {
					this.logger.warn("Missing required fields in webhook data", result);
					continue;
				}

				this.logger.log(
					`Processing YouTube video: ${title || video_id} for search space ${context.searchSpaceId}`,
				);

				await this.youtubeProcessorService.addYTVideoToVectorStore({
					transcript,
					video_id,
					title: title || "YouTube Video",
					url:
						url ||
						context.videoUrl ||
						`https://www.youtube.com/watch?v=${video_id}`,
					searchSpaceId: context.searchSpaceId,
					userId: context.userId,
					documentId: context.documentId,
				});

				this.logger.log(
					`Successfully processed YouTube video: ${title || video_id}`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Error processing BrightData webhook: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
