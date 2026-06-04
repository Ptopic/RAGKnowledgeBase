import { Injectable, Logger } from '@nestjs/common';
// import { ChatLiteLLM } from '@langchain/community/chat_models/litellm';
import { PrismaService } from '../prisma/prisma.service';
import { LiteLLMProvider } from '@prisma/client';
import { ApiKeysService } from '../api-keys/api-keys.service';

// Temporary type until ChatLiteLLM is available
type ChatLiteLLM = any;

export enum LLMRole {
	LONG_CONTEXT = 'long_context',
	FAST = 'fast',
	STRATEGIC = 'strategic',
}

@Injectable()
export class LLMService {
	private readonly logger = new Logger(LLMService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly apiKeysService: ApiKeysService,
	) {
		// Configure litellm to automatically drop unsupported parameters
		// Note: This would be set in a global litellm config if available in Node.js
	}

	/**
	 * Get a ChatLiteLLM instance for a specific user, search space, and role.
	 */
	async getUserLLMInstance(
		userId: string,
		searchSpaceId: number,
		role: LLMRole,
	): Promise<ChatLiteLLM | null> {
		try {
			// Get user's LLM preferences for this search space
			const preference = await this.prisma.userSearchSpacePreference.findFirst({
				where: {
					userId,
					searchSpaceId,
				},
			});

			if (!preference) {
				this.logger.error(
					`No LLM preferences found for user ${userId} in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Get the appropriate LLM config ID based on role
			let llmConfigId: number | null = null;
			if (role === LLMRole.LONG_CONTEXT) {
				llmConfigId = preference.longContextLlmId;
			} else if (role === LLMRole.FAST) {
				llmConfigId = preference.fastLlmId;
			} else if (role === LLMRole.STRATEGIC) {
				llmConfigId = preference.strategicLlmId;
			} else {
				this.logger.error(`Invalid LLM role: ${role}`);
				return null;
			}

			if (!llmConfigId) {
				this.logger.error(
					`No ${role} LLM configured for user ${userId} in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Get the LLM configuration
			const llmConfig = await this.prisma.lLMConfig.findFirst({
				where: {
					id: llmConfigId,
					searchSpaceId,
				},
			});

			if (!llmConfig) {
				this.logger.error(
					`LLM config ${llmConfigId} not found in search space ${searchSpaceId}`,
				);
				return null;
			}

			// Build the model string. The LiteLLMProvider enum was trimmed
			// to OPENAI only in ZR-263; the rest of this block is dead
			// scaffolding kept for backward-compat (customProvider still
			// works if a deployment chooses to use it).
			let modelString: string;
			if (llmConfig.customProvider) {
				modelString = `${llmConfig.customProvider}/${llmConfig.modelName}`;
			} else {
				modelString = `openai/${llmConfig.modelName}`;
			}

			// Create ChatLiteLLM instance - commented out as package doesn't exist
			const resolvedApiKey = await this.apiKeysService.resolveApiKey(llmConfig, userId);

			const litellmConfig: Record<string, any> = {
				model: modelString,
				apiKey: resolvedApiKey,
			};

			// Add optional parameters
			if (llmConfig.apiBase) {
				litellmConfig.apiBase = llmConfig.apiBase;
			}

			// Add any additional litellm parameters
			if (llmConfig.litellmParams) {
				Object.assign(litellmConfig, llmConfig.litellmParams);
			}

			// return new ChatLiteLLM(litellmConfig);
			return null; // Temporarily return null until ChatLiteLLM is available
		} catch (error) {
			this.logger.error(
				`Error getting LLM instance for user ${userId}, role ${role}: ${error.message}`,
			);
			return null;
		}
	}

	/**
	 * Get user's long context LLM instance for a specific search space.
	 */
	async getUserLongContextLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<ChatLiteLLM | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.LONG_CONTEXT);
	}

	/**
	 * Get user's fast LLM instance for a specific search space.
	 */
	async getUserFastLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<ChatLiteLLM | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.FAST);
	}

	/**
	 * Get user's strategic LLM instance for a specific search space.
	 */
	async getUserStrategicLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<ChatLiteLLM | null> {
		return this.getUserLLMInstance(userId, searchSpaceId, LLMRole.STRATEGIC);
	}
}
