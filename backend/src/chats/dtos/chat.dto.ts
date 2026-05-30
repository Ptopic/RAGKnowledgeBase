import { ChatType } from "@prisma/client";
import { Type } from "class-transformer";
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

export interface ChatMessageDto {
	role: string;
	content: string | Record<string, unknown> | Array<Record<string, unknown>>;
	metadata?: Record<string, unknown>;
}

export class ChatBaseDto {
	@IsEnum(ChatType)
	type: ChatType;

	@IsString()
	title: string;

	@IsArray()
	@IsOptional()
	initial_connectors?: string[];

	@IsArray()
	messages: ChatMessageDto[];

	@IsInt()
	search_space_id: number;
}

export class CreateChatDto extends ChatBaseDto {}

export class UpdateChatDto {
	@IsEnum(ChatType)
	@IsOptional()
	type?: ChatType;

	@IsString()
	@IsOptional()
	title?: string;

	@IsArray()
	@IsOptional()
	initial_connectors?: string[];

	@IsArray()
	@IsOptional()
	messages?: ChatMessageDto[];
}

export class ChatDto extends ChatBaseDto {
	@IsInt()
	id: number;

	@IsString()
	user_id: string;

	@IsOptional()
	is_favorite?: boolean;

	@Type(() => Date)
	created_at: Date;
}

export class ChatWithoutMessagesDto {
	@IsInt()
	id: number;

	@IsEnum(ChatType)
	type: ChatType;

	@IsString()
	title: string;

	@IsArray()
	@IsOptional()
	initial_connectors?: string[];

	@IsInt()
	search_space_id: number;

	@IsString()
	user_id: string;

	@IsOptional()
	is_favorite?: boolean;

	@Type(() => Date)
	created_at: Date;
}

export class AgentChatRequestDto {
	@IsArray()
	messages: ChatMessageDto[];

	@IsObject()
	@IsOptional()
	data?: Record<string, unknown>;

	@IsInt()
	@IsOptional()
	chat_id?: number;
}

export class SaveMessagesDto {
	@IsInt()
	chat_id: number;

	@IsArray()
	messages: Array<{
		role: string;
		content: string | Record<string, unknown>;
		metadata?: Record<string, unknown>;
	}>;
}

export class ToggleFavoriteDto {}

export class FavoriteChatResponseDto {
	@IsString()
	message: string;
}

export class BulkDeleteChatsDto {
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(100)
	@Type(() => Number)
	@IsInt({ each: true })
	ids: number[];
}

export interface BulkDeleteResponseDto {
	deleted: number[];
	failed: Array<{ id: number; reason: string }>;
	message: string;
}
