import { LiteLLMProvider } from '@prisma/client';
import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsEnum(LiteLLMProvider)
  provider: LiteLLMProvider;

  @IsString()
  @MaxLength(5000)
  apiKey: string;

  @IsString()
  @MaxLength(100)
  name: string;
}

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  apiKey?: string;

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
