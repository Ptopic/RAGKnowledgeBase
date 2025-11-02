"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const prompts_1 = require("@langchain/core/prompts");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const openai_1 = require("@langchain/openai");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const prompts_2 = require("./prompts");
const tools_1 = require("./tools");
let AgentService = class AgentService {
    constructor() {
        this.llm = new openai_1.ChatOpenAI({
            modelName: "gpt-4.1-mini",
        });
        this.memorySaver = new langgraph_1.MemorySaver();
        this.promptTemplate = prompts_1.PromptTemplate.fromTemplate(prompts_2.userPrompt);
        this.agent = (0, prebuilt_1.createReactAgent)({
            llm: this.llm,
            tools: [
                tools_1.retrievalTool,
                tools_1.triggerYoutubeVideoScrapeTool,
                tools_1.retrieveSimilarVideosTool,
                tools_1.retrieveStoredVideosTool,
            ],
            checkpointSaver: this.memorySaver,
        });
    }
    async chat(chatDto) {
        const { message, thread_id } = chatDto;
        const formattedPrompt = await this.promptTemplate.format({
            message: message,
        });
        const results = await this.agent.invoke({
            messages: [{ role: "user", content: formattedPrompt }],
        }, { configurable: { thread_id } });
        return results.messages.at(-1).content;
    }
    streamChat(chatDto) {
        const { message, thread_id } = chatDto;
        return new rxjs_1.Observable((subscriber) => {
            (async () => {
                try {
                    const formattedPrompt = await this.promptTemplate.format({
                        message: message,
                    });
                    let isStreamingFinalResponse = false;
                    const streamingLlm = new openai_1.ChatOpenAI({
                        modelName: "gpt-4.1-mini",
                        streaming: true,
                        configuration: {
                            baseURL: "http://localhost:8585/jawn/v1/gateway/oai/v1",
                            defaultHeaders: {
                                "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
                            },
                        },
                        callbacks: [
                            {
                                handleLLMNewToken(token) {
                                    if (isStreamingFinalResponse) {
                                        subscriber.next(token);
                                    }
                                },
                                handleLLMError(err) {
                                    subscriber.error(err);
                                },
                                handleLLMStart() {
                                    isStreamingFinalResponse = true;
                                },
                            },
                        ],
                    });
                    const streamingAgent = (0, prebuilt_1.createReactAgent)({
                        llm: streamingLlm,
                        tools: [
                            tools_1.retrievalTool,
                            tools_1.triggerYoutubeVideoScrapeTool,
                            tools_1.retrieveSimilarVideosTool,
                            tools_1.retrieveStoredVideosTool,
                        ],
                        checkpointSaver: this.memorySaver,
                    });
                    await streamingAgent.invoke({
                        messages: [{ role: "user", content: formattedPrompt }],
                    }, { configurable: { thread_id } });
                    subscriber.complete();
                }
                catch (error) {
                    subscriber.error(error);
                }
            })();
        });
    }
};
exports.AgentService = AgentService;
exports.AgentService = AgentService = __decorate([
    (0, common_1.Injectable)()
], AgentService);
//# sourceMappingURL=agent.service.js.map