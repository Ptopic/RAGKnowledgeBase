import { SearchSourceConnectorType } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	ValidateIf,
} from "class-validator";

export class CreateSearchSourceConnectorDto {
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

export class SearchSourceConnectorDto {
	@IsInt()
	id: number;

	@IsInt()
	search_space_id: number;

	@IsUUID()
	user_id: string;

	@Type(() => Date)
	created_at: Date;

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

export class GitHubPATRequestDto {
	@IsString()
	github_pat: string;
}
