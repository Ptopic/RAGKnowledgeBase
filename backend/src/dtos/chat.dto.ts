import { IsString, IsInt, IsEnum, IsArray, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatType } from '@prisma/client';

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
  createdAt: Date;
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
  createdAt: Date;
}

export class AISDKChatRequestDto {
  @IsArray()
  messages: any[];

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
