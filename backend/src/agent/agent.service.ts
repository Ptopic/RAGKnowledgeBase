import { PromptTemplate } from "@langchain/core/prompts";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { YoutubeProcessorService } from "../tasks/document-processors";
import { ChatDto } from "./dtos/chat.dto";
import { ResearcherDto } from "./dtos/researcher.dto";
import { userPrompt } from "./prompts";
import { ResearcherService } from "./researcher.service";

@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);

	private readonly llm = new ChatOpenAI({
		modelName: "gpt-4o-mini",
	});

	private readonly memorySaver = new MemorySaver();

	private readonly promptTemplate = PromptTemplate.fromTemplate(userPrompt);

	private readonly agent = createReactAgent({
		llm: this.llm,
		tools: [],
		checkpointSaver: this.memorySaver,
	});

	constructor(
		private readonly researcherService: ResearcherService,
		private readonly youtubeProcessorService: YoutubeProcessorService,
	) {}

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
	 * Researcher agent - delegates to ResearcherService
	 */
	streamResearcher(researcherDto: ResearcherDto): Observable<string> {
		return this.researcherService.streamResearcher(researcherDto);
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
