import {
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SearchSourceConnectorType } from '@prisma/client';

export class SearchSourceConnectorBaseDto {
  @IsString()
  name: string;

  @IsEnum(SearchSourceConnectorType)
  connector_type: SearchSourceConnectorType;

  @IsBoolean()
  is_indexable: boolean;

  @IsOptional()
  @Type(() => Date)
  last_indexed_at?: Date;

  @IsObject()
  config: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  periodic_indexing_enabled?: boolean;

  @IsInt()
  @IsOptional()
  @ValidateIf((o) => o.periodic_indexing_enabled === true)
  indexing_frequency_minutes?: number;

  @IsOptional()
  @Type(() => Date)
  next_scheduled_at?: Date;
}

export class CreateSearchSourceConnectorDto extends SearchSourceConnectorBaseDto {}

export class UpdateSearchSourceConnectorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SearchSourceConnectorType)
  @IsOptional()
  connector_type?: SearchSourceConnectorType;

  @IsBoolean()
  @IsOptional()
  is_indexable?: boolean;

  @IsOptional()
  @Type(() => Date)
  last_indexed_at?: Date;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  periodic_indexing_enabled?: boolean;

  @IsInt()
  @IsOptional()
  indexing_frequency_minutes?: number;

  @IsOptional()
  @Type(() => Date)
  next_scheduled_at?: Date;
}

export class SearchSourceConnectorDto extends SearchSourceConnectorBaseDto {
  @IsInt()
  id: number;

  @IsInt()
  search_space_id: number;

  @IsUUID()
  user_id: string;

  @Type(() => Date)
  createdAt: Date;
}

export class GitHubPATRequestDto {
  @IsString()
  github_pat: string;
}
