import type { Message } from "@ai-sdk/react";
import type { ResearchMode } from "@/components/chat/types";

export interface Chat {
	created_at: string;
	id: number;
	type: string;
	title: string;
	search_space_id: number;
	user_id: string;
	is_favorite?: boolean;
}

export interface GetChatsParams {
	search_space_id: string;
}

export interface GetFavoriteChatsParams {
	search_space_id: string;
}

export interface ToggleFavoriteResponse {
	id: number;
	is_favorite: boolean;
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

export interface BulkDeleteChatsParams {
	ids: number[];
	search_space_id: number;
}

export interface BulkDeleteChatsResponse {
	deleted: number[];
	failed: Array<{ id: number; reason: string }>;
	message: string;
}
