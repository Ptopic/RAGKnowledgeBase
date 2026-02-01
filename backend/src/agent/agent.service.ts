import { PromptTemplate } from "@langchain/core/prompts";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { ChatsService } from "src/chats/chats.service";
import { SearchMode, StreamingService } from "src/services";
import { YoutubeProcessorService } from "../tasks/document-processors";
import { userPrompt } from "./prompts";
import { ResearcherService } from "./researcher.service";
import { ConversationMemoryService } from "./services";

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
}

@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);

	private readonly llm = new ChatOpenAI({
		modelName: "gpt-4o-mini",
	});

	private readonly memorySaver = new MemorySaver();

	private readonly streamingService = new StreamingService();

	private readonly promptTemplate = PromptTemplate.fromTemplate(userPrompt);

	private readonly agent = createReactAgent({
		llm: this.llm,
		tools: [],
		checkpointSaver: this.memorySaver,
	});

	constructor(
		private readonly researcherService: ResearcherService,
		private readonly youtubeProcessorService: YoutubeProcessorService,
		private readonly chatsService: ChatsService,
		private readonly conversationMemoryService: ConversationMemoryService,
	) {}

	/**
	 * Format data for AI SDK data stream protocol
	 * Format: 0:"text content"\n
	 */
	private formatDataStreamChunk(text: string): string {
		// Escape quotes and newlines in the text
		const escaped = text
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\n/g, "\\n");
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
	 * Returns a Response object with text/event-stream for LangChain SDK compatibility.
	 *
	 * @param params - Search parameters
	 * @returns Response with streaming data
	 */
	async streamConnectorSearchResults(
		params: StreamConnectorSearchResultsParams,
	): Promise<{ stream: any; chatId?: number; chatWasCreated: boolean }> {
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
					messages: [], // Will be updated after streaming
					search_space_id: params.searchSpaceId,
				},
				params.userId,
			);
			currentChatId = newChat.id;
			chatWasCreated = true;
		}

		// Fetch recent messages from the chat if chatId exists
		let recentMessages: Array<{ role: string; content: string }> = [];
		if (currentChatId) {
			recentMessages = await this.conversationMemoryService.getRecentMessages(
				currentChatId,
				params.userId,
				10, // Get last 10 messages
			);
		}

		try {
			// Convert search mode string to enum
			let searchMode: SearchMode;
			if (params.searchModeStr === "CHUNKS") {
				searchMode = SearchMode.CHUNKS;
			} else if (params.searchModeStr === "DOCUMENTS") {
				searchMode = SearchMode.DOCUMENTS;
			} else {
				searchMode = SearchMode.CHUNKS; // Default
			}

			// Use chatId as thread_id for persistent checkpoint state
			const persistentThreadId = currentChatId
				? `chat-${currentChatId}`
				: `${params.userId}_${params.searchSpaceId}`;

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

			// Call the researcher service with proper DTO
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

			// Stream from researcher service
			const stream =
				await this.researcherService.streamResearcher(researcherDto);

			return { stream, chatId: currentChatId, chatWasCreated };
		} catch (error) {
			this.logger.error(
				`Error streaming connector search results: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Save messages to a chat after streaming completes
	 */
	async saveMessages(
		chatId: number,
		userId: string,
		messages: Array<{ role: string; content: string }>,
	): Promise<void> {
		// Convert messages to the format expected by ConversationMemoryService
		const messagesToAdd = messages.map((msg) => ({
			role: msg.role as "user" | "assistant",
			content: msg.content,
		}));

		await this.conversationMemoryService.addMessages(
			chatId,
			userId,
			messagesToAdd,
		);
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
		},
	): Promise<void> {
		try {
			this.logger.log("Processing BrightData webhook data");

			// Extract data from webhook payload
			// BrightData sends an array of results
			if (
				!webhookData ||
				!Array.isArray(webhookData) ||
				webhookData.length === 0
			) {
				this.logger.warn("Empty or invalid webhook data received");
				return;
			}

			// Validate context from query parameters
			if (!context.searchSpaceId || !context.userId || !context.videoUrl) {
				this.logger.error(
					"Missing required context in webhook URL query parameters",
					context,
				);
				throw new Error(
					"Missing required context (searchSpaceId, userId, videoUrl) in webhook URL",
				);
			}

			// Process each result in the webhook
			for (const result of webhookData) {
				const { transcript, video_id, title, url } = result;

				if (!transcript || !video_id) {
					this.logger.warn("Missing required fields in webhook data", result);
					continue;
				}

				this.logger.log(
					`Processing YouTube video: ${title || video_id} for search space ${context.searchSpaceId}`,
				);

				// Use the existing YouTube processor to add to vector store
				// Context (searchSpaceId, userId) comes from webhook URL query params
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
