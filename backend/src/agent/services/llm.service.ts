import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * LLM Roles for different use cases
 */
export enum LLMRole {
	LONG_CONTEXT = "long_context",
	FAST = "fast",
	STRATEGIC = "strategic",
}

/**
 * Service for managing LLM instances based on user preferences
 */
@Injectable()
export class LLMService {
	private readonly logger = new Logger(LLMService.name);

	constructor(private prisma: PrismaService) {}

	/**
	 * Get a LLM instance for a specific user, search space, and role
	 */
	async getUserLLMInstance(
		userId: string,
		searchSpaceId: number,
		role: LLMRole,
	): Promise<BaseChatModel | null> {
		try {
			// Get user's LLM preferences for this search space
			const preference =
				await this.prisma.userSearchSpacePreference.findUnique({
					where: {
						userId_searchSpaceId: {
							userId,
							searchSpaceId,
						},
					},
					include: {
						longContextLlm: true,
						fastLlm: true,
						strategicLlm: true,
					},
				});

			if (!preference) {
				this.logger.error(
					`No LLM preferences found for user ${userId} in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Get the appropriate LLM config based on role
			let llmConfig: any = null;
			if (role === LLMRole.LONG_CONTEXT) {
				llmConfig = preference.longContextLlm;
			} else if (role === LLMRole.FAST) {
				llmConfig = preference.fastLlm;
			} else if (role === LLMRole.STRATEGIC) {
				llmConfig = preference.strategicLlm;
			}

			if (!llmConfig) {
				this.logger.error(
					`No ${role} LLM configured for user ${userId} in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Create and return the appropriate LLM instance
			return this.createLLMInstance(llmConfig);
		} catch (error) {
			this.logger.error(
				`Error getting LLM instance for user ${userId}, role ${role}: ${error.message}`,
				error.stack,
			);
			return null;
		}
	}

	/**
	 * Create an LLM instance from configuration
	 */
	private createLLMInstance(llmConfig: any): BaseChatModel | null {
		try {
			const provider = llmConfig.provider;
			const modelName = llmConfig.modelName;
			const apiKey = llmConfig.apiKey;
			const apiBase = llmConfig.apiBase;
			const litellmParams = llmConfig.litellmParams || {};

			// Map provider to LangChain model
			switch (provider) {
				case "OPENAI":
				case "DEEPSEEK":
				case "ALIBABA_QWEN":
				case "MOONSHOT":
				case "ZHIPU":
					return new ChatOpenAI({
						modelName,
						openAIApiKey: apiKey,
						configuration: apiBase
							? {
									baseURL: apiBase,
								}
							: undefined,
						...litellmParams,
					});

				case "ANTHROPIC":
					return new ChatAnthropic({
						modelName,
						anthropicApiKey: apiKey,
						anthropicApiUrl: apiBase,
						...litellmParams,
					});

				case "GROQ":
					return new ChatOpenAI({
						modelName,
						openAIApiKey: apiKey,
						configuration: {
							baseURL: apiBase || "https://api.groq.com/openai/v1",
						},
						...litellmParams,
					});

				case "OLLAMA":
					return new ChatOpenAI({
						modelName,
						openAIApiKey: "ollama", // Ollama doesn't need API key
						configuration: {
							baseURL: apiBase || "http://localhost:11434/v1",
						},
						...litellmParams,
					});

				case "AZURE_OPENAI":
					return new ChatOpenAI({
						modelName,
						openAIApiKey: apiKey,
						configuration: apiBase
							? {
									baseURL: apiBase,
								}
							: undefined,
						...litellmParams,
					});

				// Add more providers as needed
				default:
					this.logger.warn(
						`Provider ${provider} not directly supported, attempting OpenAI-compatible interface`,
					);
					return new ChatOpenAI({
						modelName,
						openAIApiKey: apiKey,
						configuration: apiBase
							? {
									baseURL: apiBase,
								}
							: undefined,
						...litellmParams,
					});
			}
		} catch (error) {
			this.logger.error(
				`Error creating LLM instance: ${error.message}`,
				error.stack,
			);
			return null;
		}
	}

	/**
	 * Get user's long context LLM instance
	 */
	async getUserLongContextLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<BaseChatModel | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.LONG_CONTEXT);
	}

	/**
	 * Get user's fast LLM instance
	 */
	async getUserFastLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<BaseChatModel | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.FAST);
	}

	/**
	 * Get user's strategic LLM instance
	 */
	async getUserStrategicLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<BaseChatModel | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.STRATEGIC);
	}

	/**
	 * Get the model name from an LLM instance
	 */
	getModelName(llm: BaseChatModel): string {
		if (llm instanceof ChatOpenAI) {
			return llm.modelName || "gpt-3.5-turbo";
		} else if (llm instanceof ChatAnthropic) {
			return llm.model || "claude-3-sonnet-20240229";
		}
		return "unknown";
	}
}
