import { LiteLLMProvider } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

export class LLMConfigBaseDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsEnum(LiteLLMProvider)
	provider: LiteLLMProvider;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	custom_provider?: string;

	@IsString()
	@MaxLength(100)
	model_name: string;

	@IsString()
	api_key: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	api_base?: string;

	@IsString()
	@IsOptional()
	@MaxLength(50)
	language?: string;

	@IsObject()
	@IsOptional()
	litellm_params?: Record<string, any>;
}

export class CreateLLMConfigDto extends LLMConfigBaseDto {
	@IsInt()
	search_space_id: number;
}

export class UpdateLLMConfigDto {
	@IsString()
	@IsOptional()
	@MaxLength(100)
	name?: string;

	@IsEnum(LiteLLMProvider)
	@IsOptional()
	provider?: LiteLLMProvider;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	custom_provider?: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	model_name?: string;

	@IsString()
	@IsOptional()
	api_key?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	api_base?: string;

	@IsString()
	@IsOptional()
	@MaxLength(50)
	language?: string;

	@IsObject()
	@IsOptional()
	litellm_params?: Record<string, any>;
}

export class LLMConfigDto extends LLMConfigBaseDto {
	@IsInt()
	id: number;

	@IsInt()
	search_space_id: number;

	@Type(() => Date)
	created_at: Date;
}

export class LLMPreferencesUpdateDto {
	@IsInt()
	@IsOptional()
	long_context_llm_id?: number;

	@IsInt()
	@IsOptional()
	fast_llm_id?: number;

	@IsInt()
	@IsOptional()
	strategic_llm_id?: number;
}

export class LLMPreferencesDto {
	@IsInt()
	@IsOptional()
	long_context_llm_id?: number;

	@IsInt()
	@IsOptional()
	fast_llm_id?: number;

	@IsInt()
	@IsOptional()
	strategic_llm_id?: number;

	@IsOptional()
	long_context_llm?: LLMConfigDto;

	@IsOptional()
	fast_llm?: LLMConfigDto;

	@IsOptional()
	strategic_llm?: LLMConfigDto;
}
