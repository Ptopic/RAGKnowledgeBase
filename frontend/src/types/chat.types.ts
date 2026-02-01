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

export interface OrderedStreamMessage extends Message {
	// any extra?
}
