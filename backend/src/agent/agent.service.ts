import { PromptTemplate } from "@langchain/core/prompts";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { ChatDto } from "./dtos/chat.dto";
import { userPrompt } from "./prompts";
import {
	retrievalTool,
	retrieveSimilarVideosTool,
	retrieveStoredVideosTool,
	triggerYoutubeVideoScrapeTool,
} from "./tools";

@Injectable()
export class AgentService {
	// private readonly llm = new ChatAnthropic({
	// 	modelName: 'claude-3-7-sonnet-latest',
	// });

	private readonly llm = new ChatOpenAI({
		modelName: "gpt-4.1-mini",
	});

	private readonly memorySaver = new MemorySaver();

	private readonly promptTemplate = PromptTemplate.fromTemplate(userPrompt);

	private readonly agent = createReactAgent({
		llm: this.llm,
		tools: [
			retrievalTool,
			triggerYoutubeVideoScrapeTool,
			retrieveSimilarVideosTool,
			retrieveStoredVideosTool,
		],
		checkpointSaver: this.memorySaver,
	});

	async chat(chatDto: ChatDto) {
		const { message, thread_id } = chatDto;

		const formattedPrompt = await this.promptTemplate.format({
			message: message,
		});

		const results = await this.agent.invoke(
			{
				messages: [{ role: "user", content: formattedPrompt }],
			},
			{ configurable: { thread_id } }
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
						modelName: "gpt-4.1-mini",
						streaming: true,
						configuration: {
							baseURL: "http://localhost:8585/jawn/v1/gateway/oai/v1", // Helicone local proxy
							defaultHeaders: {
								"Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`, // your Helicone key
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
						tools: [
							retrievalTool,
							triggerYoutubeVideoScrapeTool,
							retrieveSimilarVideosTool,
							retrieveStoredVideosTool,
						],
						checkpointSaver: this.memorySaver,
					});

					await streamingAgent.invoke(
						{
							messages: [{ role: "user", content: formattedPrompt }],
						},
						{ configurable: { thread_id } }
					);

					subscriber.complete();
				} catch (error) {
					subscriber.error(error);
				}
			})();
		});
	}
}
