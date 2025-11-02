import type { Message } from "@ai-sdk/react";
import type { ResearchMode } from "@/components/chat/types";

export interface Chat {
	created_at: string;
	id: number;
	type: string;
	title: string;
	search_space_id: number;
}

export interface GetChatsParams {
	search_space_id: string;
}

export interface ChatDetails extends Chat {
	messages: Message[];
	initial_connectors: string[];
}

export interface CreateChatRequest {
	type: ResearchMode;
	title: string;
	initial_connectors: string[];
	messages: Message[];
	search_space_id: number;
}

export interface CreateChatResponse {
	id: number;
}

export interface UpdateChatRequest {
	type: ResearchMode;
	title: string;
	initial_connectors: string[];
	messages: Message[];
	search_space_id: number;
}
