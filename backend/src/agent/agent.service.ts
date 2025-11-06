import { PromptTemplate } from "@langchain/core/prompts";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { ChatDto } from "./dtos/chat.dto";
import { ResearcherDto } from "./dtos/researcher.dto";
import { userPrompt } from "./prompts";
import { ResearcherService } from "./researcher.service";
import { retrievalTool } from "./tools";

@Injectable()
export class AgentService {
	private readonly llm = new ChatOpenAI({
		modelName: "gpt-4o-mini",
	});

	private readonly memorySaver = new MemorySaver();

	private readonly promptTemplate = PromptTemplate.fromTemplate(userPrompt);

	private readonly agent = createReactAgent({
		llm: this.llm,
		tools: [retrievalTool],
		checkpointSaver: this.memorySaver,
	});

	constructor(private readonly researcherService: ResearcherService) {}

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
						tools: [retrievalTool],
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
}
