import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

/**
 * Message content can be:
 * - string: plain text or AI message content
 * - object: serialized tool call (will be stored as JSON string in database)
 */
export interface MessageToAdd {
	role: "user" | "assistant";
	content: string | Record<string, unknown>;
	metadata?: Record<string, unknown>;
}

/**
 * Message exchange format: [[userMsg, assistantMsg], [userMsg, assistantMsg]]
 * Each inner array represents a complete exchange (user message + AI response)
 */
export type MessageExchange = {
	role: string;
	content: string;
	timestamp?: string;
	metadata?: Record<string, unknown>;
}[];

export type ConversationHistory = MessageExchange[];

/**
 * Service for managing conversation memory
 * Handles fetching recent messages and adding new messages to chats
 */
@Injectable()
export class ConversationMemoryService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Verify chat ownership and return the chat
	 */
	private async verifyChatOwnership(chatId: number, userId: string) {
		const chat = await this.prisma.chat.findFirst({
			where: {
				id: chatId,
				userId,
			},
		});

		if (!chat) {
			throw new NotFoundException(
				"Chat not found or you do not have permission to access it",
			);
		}

		return chat;
	}

	/**
	 * Get recent messages from a chat
	 * Returns messages in the format expected by LangChain (flat array)
	 * Messages are stored as nested exchanges: [[msg1, msg2], [msg3, msg4]]
	 *
	 * Note: Tool calls are stored as JSON strings and will be returned as strings.
	 * Use parsePersistedMessage() from message-adapter to parse them back to objects.
	 */
	async getRecentMessages(
		chatId: number,
		userId: string,
		limit: number = 10,
	): Promise<ChatMessage[]> {
		try {
			const chat = await this.verifyChatOwnership(chatId, userId);

			// Messages are stored as nested exchanges, flatten them
			const exchanges = (chat.messages || []) as ConversationHistory;
			const flatMessages = exchanges.flat();

			// Return last N messages (sliding window)
			// Note: Object content (tool calls) is stored as JSON strings
			return flatMessages.slice(-limit).map((msg) => ({
				role: (msg.role || "user") as "user" | "assistant" | "system",
				content: typeof msg.content === "object"
					? JSON.stringify(msg.content)
					: (msg.content || ""),
			}));
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			// Return empty array on error for graceful degradation
			return [];
		}
	}

	/**
	 * Add messages to a chat
	 * Appends new messages as an exchange (wrapped in an array) to the existing messages array
	 * Format: [[msg1, msg2], [msg3, msg4]] where each inner array is a message exchange
	 *
	 * Note: Object content (tool calls) will be serialized as JSON strings for database storage.
	 */
	async addMessages(
		chatId: number,
		userId: string,
		messagesToAdd: MessageToAdd[],
	): Promise<void> {
		const chat = await this.verifyChatOwnership(chatId, userId);

		// Get existing messages (should be array of exchanges)
		const existingMessages = (chat.messages || []) as ConversationHistory;

		// Format new messages as a single exchange (wrapped in an array)
		// Note: Object content (tool calls) is serialized as JSON string
		const newExchange: MessageExchange = messagesToAdd.map((msg) => ({
			role: msg.role,
			content: typeof msg.content === "object"
				? JSON.stringify(msg.content)
				: msg.content,
			timestamp: new Date().toISOString(),
			...(msg.metadata ? { metadata: msg.metadata } : {}),
		}));

		// Append the new exchange to the existing messages
		const updatedMessages: ConversationHistory = [
			...existingMessages,
			newExchange,
		];

		// Update chat
		await this.prisma.chat.update({
			where: { id: chatId },
			data: { messages: updatedMessages as Prisma.InputJsonValue },
		});
	}
}
