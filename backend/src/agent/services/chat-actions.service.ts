import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ConversationMemoryService } from "./conversation-memory.service";

/**
 * Service for handling different chat actions (save messages to different chat types)
 * Supports regular chats, article chats, and potentially other types
 */
@Injectable()
export class ChatActionsService {
	constructor(
		private prisma: PrismaService,
		private conversationMemory: ConversationMemoryService,
	) {}

	/**
	 * Save messages to a regular chat using conversation memory
	 * Supports tool calls via metadata
	 *
	 * This is the primary method for saving messages to chats.
	 * It handles both new message creation and existing message continuation.
	 *
	 * Messages are saved as nested exchanges: [[user, ai, tool], [user, ai, ...]]
	 * Each exchange represents one complete user-AI interaction.
	 *
	 * @param chatId - The chat ID to save messages to
	 * @param userId - The user ID for permission checking
	 * @param messages - Array of LangChain messages to save (formatted as exchange)
	 * @param lastUserMessage - The last user message content (for proper exchange formatting)
	 */
	async saveMessagesToRegularChat(
		chatId: number,
		userId: string,
		messages: Array<{
			role: "user" | "assistant";
			content: string;
			metadata?: Record<string, unknown>;
		}>,
		lastUserMessage: string,
	): Promise<void> {
		// Messages are already formatted as an exchange on the frontend
		// We just need to add it as a single wrapped exchange
		await this.conversationMemory.addMessages(chatId, userId, messages);
	}

	/**
	 * Get recent messages from a chat for UI display
	 * Wraps conversation memory service with proper flattening
	 *
	 * @param chatId - The chat ID to fetch messages from
	 * @param userId - The user ID for permission checking
	 * @returns Flat array of messages for UI consumption
	 */
	async getMessagesForDisplay(
		chatId: number,
		userId: string,
	): Promise<
		Array<{
			role: "user" | "assistant" | "system";
			content: string;
			metadata?: Record<string, unknown>;
		}>
	> {
		// Get recent messages (already serialized)
		const messages = await this.conversationMemory.getRecentMessages(
			chatId,
			userId,
			100, // Get up to 100 messages
		);

		return messages.map((msg) => ({
			role: msg.role,
			content: msg.content,
			// Include metadata if present (for tool calls, etc.)
			metadata: undefined, // Conversation memory doesn't expose metadata directly
		}));
	}
}
