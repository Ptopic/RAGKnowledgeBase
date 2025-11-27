import { PromptTemplate } from "@langchain/core/prompts";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { ChatDto } from "./dtos/chat.dto";
import { ResearcherDto } from "./dtos/researcher.dto";
import { agentUserPrompt, userPrompt } from "./prompts";
import { ConnectorService } from "./services/connector.service";
import { LLMService } from "./services/llm.service";
import { PromptsService } from "./services/prompts.service";
import { QNAService } from "./services/qna.service";
import { RerankerService } from "./services/reranker.service";
import { createAgentTools } from "./tools";

@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);

	private readonly llm = new ChatOpenAI({
		modelName: "gpt-4o-mini",
	});

	private readonly memorySaver = new MemorySaver();

	private readonly promptTemplate = PromptTemplate.fromTemplate(userPrompt);

	// Tools will be created with service dependencies
	private readonly tools: ReturnType<typeof createAgentTools>;

	// Agent will be initialized after tools are created
	private readonly agent;

	constructor(
		private readonly connectorService: ConnectorService,
		private readonly llmService: LLMService,
		private readonly promptsService: PromptsService,
		private readonly qnaService: QNAService,
		private readonly rerankerService: RerankerService,
	) {
		// Create tools with service dependencies
		this.tools = createAgentTools(
			this.connectorService,
			this.llmService,
			this.promptsService,
			this.qnaService,
			this.rerankerService,
		);

		// Create agent with tools
		this.agent = createReactAgent({
			llm: this.llm,
			tools: [
				this.tools.searchConnectorsTool,
				this.tools.reformulateQueryTool,
				this.tools.rerankDocumentsTool,
				this.tools.generateAnswerTool,
				this.tools.generateFollowUpQuestionsTool,
			],
			checkpointSaver: this.memorySaver,
		});
	}

	async chat(chatDto: ChatDto) {
		const { message, thread_id } = chatDto;

		const formattedPrompt = await this.promptTemplate.format({
			message: message,
		});

		const results = await this.agent.invoke(
			{
				messages: [{ role: "user", content: formattedPrompt }],
			},
			{ configurable: { thread_id } },
		);

		return results.messages.at(-1).content;
	}

	streamChat(chatDto: ChatDto): Observable<string> {
		const { message, thread_id } = chatDto;

		return new Observable((subscriber) => {
			(async () => {
				try {
					const formattedPrompt = await this.promptTemplate.format({
						message: message,
					});

					let isStreamingFinalResponse = false;

					const streamingLlm = new ChatOpenAI({
						modelName: "gpt-4o-mini",
						streaming: true,
						configuration: {
							baseURL: "http://localhost:8585/jawn/v1/gateway/oai/v1",
							defaultHeaders: {
								"Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
							},
						},
						callbacks: [
							{
								handleLLMNewToken(token: string) {
									if (isStreamingFinalResponse) {
										subscriber.next(token);
									}
								},
								handleLLMError(err: Error) {
									subscriber.error(err);
								},
								handleLLMStart() {
									isStreamingFinalResponse = true;
								},
							},
						],
					});

					const streamingAgent = createReactAgent({
						llm: streamingLlm,
						tools: [],
						checkpointSaver: this.memorySaver,
					});

					await streamingAgent.invoke(
						{
							messages: [{ role: "user", content: formattedPrompt }],
						},
						{ configurable: { thread_id } },
					);

					subscriber.complete();
				} catch (error) {
					subscriber.error(error);
				}
			})();
		});
	}

	/**
	 * Researcher agent - uses LangChain ReAct agent with tools
	 */
	streamResearcher(researcherDto: ResearcherDto): Observable<string> {
		const {
			user_query,
			connectors_to_search,
			user_id,
			search_space_id,
			language,
			chat_history = [],
		} = researcherDto;

		return new Observable((subscriber) => {
			(async () => {
				try {
					this.logger.log(
						`Starting agent-based researcher with query: ${user_query}`,
					);

					// Create enhanced prompt with context about available tools
					const enhancedPrompt = agentUserPrompt(
						user_query,
						connectors_to_search,
						language,
						chat_history,
					);

					let isStreamingFinalResponse = false;

					const streamingLlm = new ChatOpenAI({
						modelName: "gpt-4o-mini",
						streaming: true,
						callbacks: [
							{
								handleLLMNewToken(token: string) {
									if (isStreamingFinalResponse) {
										subscriber.next(token);
									}
								},
								handleLLMError(err: Error) {
									subscriber.error(err);
								},
								handleLLMStart() {
									isStreamingFinalResponse = true;
								},
							},
						],
					});

					const streamingAgent = createReactAgent({
						llm: streamingLlm,
						tools: [
							this.tools.searchConnectorsTool,
							this.tools.reformulateQueryTool,
							this.tools.rerankDocumentsTool,
							this.tools.generateAnswerTool,
							this.tools.generateFollowUpQuestionsTool,
						],
						checkpointSaver: this.memorySaver,
					});

					await streamingAgent.invoke(
						{
							messages: [{ role: "user", content: enhancedPrompt }],
						},
						{
							configurable: {
								thread_id: `researcher_${user_id}_${Date.now()}`,
							},
						},
					);

					subscriber.complete();
				} catch (error) {
					this.logger.error(
						`Error in agent researcher: ${error.message}`,
						error.stack,
					);
					subscriber.error(error);
				}
			})();
		});
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
