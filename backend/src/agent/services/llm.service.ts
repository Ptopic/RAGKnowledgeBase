import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { LLMConfig } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { ApiKeysService } from "src/api-keys/api-keys.service";

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

	constructor(
		private prisma: PrismaService,
		private apiKeysService: ApiKeysService,
	) {}

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
			const preference = await this.prisma.userSearchSpacePreference.findUnique(
				{
					where: {
						uq_user_searchspace: {
							userId,
							searchSpaceId,
						},
					},
					include: {
						longContextLlm: true,
						fastLlm: true,
						strategicLlm: true,
					},
				},
			);

			if (!preference) {
				this.logger.error(
					`No LLM preferences found for user ${userId} in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Get the appropriate LLM config based on role
			let llmConfig: LLMConfig | null = null;
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
			return await this.createLLMInstance(llmConfig, userId);
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
	private async createLLMInstance(llmConfig: LLMConfig, userId: string): Promise<BaseChatModel | null> {
		try {
			const modelName = llmConfig.modelName;
			const apiKey = await this.apiKeysService.resolveApiKey(llmConfig, userId);
			const apiBase = llmConfig.apiBase;
			const litellmParams = llmConfig.litellmParams || {};

			return new ChatOpenAI({
				modelName,
				openAIApiKey: apiKey,
				configuration: apiBase ? { baseURL: apiBase } : undefined,
				...litellmParams,
			});
		} catch (error) {
			this.logger.error(`Error creating LLM instance: ${error.message}`, error.stack);
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
			return (llm as ChatOpenAI).modelName || "gpt-3.5-turbo";
		}
		// else if (llm instanceof ChatAnthropic) {
		// 	return llm.model || "claude-3-sonnet-20240229";
		// }
		return "unknown";
	}

	/**
	 * Get the configured language for a specific LLM role
	 */
	async getUserLLMLanguage(
		userId: string,
		_searchSpaceId: number,
		_role?: LLMRole,
	): Promise<string | null> {
		try {
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: { preferredLanguage: true },
			});
			return user?.preferredLanguage || "English";
		} catch (error) {
			this.logger.error(
				`Error getting language for user ${userId}: ${error.message}`,
				error.stack,
			);
			return "English";
		}
	}

	async getUserFastLLMLanguage(
		userId: string,
		searchSpaceId: number,
	): Promise<string | null> {
		return this.getUserLLMLanguage(userId, searchSpaceId, LLMRole.FAST);
	}
}
