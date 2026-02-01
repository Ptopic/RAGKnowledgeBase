import { ChatType } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsArray,
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

export class ChatBaseDto {
	@IsEnum(ChatType)
	type: ChatType;

	@IsString()
	title: string;

	@IsArray()
	@IsOptional()
	initial_connectors?: string[];

	@IsArray()
	messages: any[];

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
	messages?: any[];
}

export class ChatDto extends ChatBaseDto {
	@IsInt()
	id: number;

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

	@Type(() => Date)
	created_at: Date;
}

export class AgentChatRequestDto {
	@IsArray()
	messages: any[];

	@IsObject()
	@IsOptional()
	data?: Record<string, any>;

	@IsInt()
	@IsOptional()
	chat_id?: number;
}

export class SaveMessagesDto {
	@IsInt()
	chat_id: number;

	@IsArray()
	messages: Array<{ role: string; content: string }>;
}
