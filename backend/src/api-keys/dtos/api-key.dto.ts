import { LiteLLMProvider } from "@prisma/client";
import {
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

export class CreateApiKeyDto {
	@IsEnum(LiteLLMProvider)
	provider: LiteLLMProvider;

	@IsString()
	@IsNotEmpty()
	@MaxLength(5000)
	api_key: string;

	@IsString()
	@MaxLength(100)
	name: string;
}

export class UpdateApiKeyDto {
	@IsString()
	@IsOptional()
	@MaxLength(5000)
	api_key?: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	name?: string;
}

export class ApiKeyDto {
	id: string;
	provider: LiteLLMProvider;
	name: string;
	created_at: Date;
}
