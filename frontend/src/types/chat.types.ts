import type { Message } from "@langchain/core/messages";

export interface IChatSearchFilters {
	// Define properties based on usage or generic filters
	search_space_id?: string;
	date_range?: { start: Date; end: Date };
}

export interface ITranscriptChatSearchFilters {
	// Define properties specific to transcripts
	speaker?: string;
}

export type ChatMessage =
	| Message
	| {
			id?: string;
			type: "question";
			content: string;
			additional_kwargs?: Record<string, any>;
	  };

// Tool call metadata stored in message
export interface ToolMessageMetadata {
	kind: `tool_${string}`;
	toolName: string;
	runId: string;
	data: unknown;
	status?: "success" | "error";
}

// Individual message in database (stored in nested exchanges)
export interface StoredMessage {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp?: string;
	metadata?: ToolMessageMetadata;
}

// Message exchange (one complete user-AI interaction with tools)
export type MessageExchange = StoredMessage[];

// Full conversation history (array of exchanges)
export type ConversationHistory = MessageExchange[];

// Ordered stream message (for saving after stream finishes)
export type OrderedStreamMessage =
	| { type: "ai"; content: string; metadata?: Record<string, unknown> }
	| {
			type: "tool";
			toolName: string;
			runId: string;
			args?: Record<string, unknown>;
			data: unknown;
			content: string;
			status: "success" | "error" | undefined;
	  };
