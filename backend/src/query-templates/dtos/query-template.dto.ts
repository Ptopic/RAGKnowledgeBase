import { Type } from "class-transformer";
import {
	IsBoolean,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
} from "class-validator";

export class CreateQueryTemplateDto {
	@IsString()
	@MaxLength(200)
	title: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsString()
	content: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	icon?: string;

	@IsBoolean()
	@IsOptional()
	is_global?: boolean;

	@IsInt()
	@IsOptional()
	search_space_id?: number;
}

export class UpdateQueryTemplateDto {
	@IsString()
	@IsOptional()
	@MaxLength(200)
	title?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsString()
	@IsOptional()
	content?: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	icon?: string;

	@IsBoolean()
	@IsOptional()
	is_global?: boolean;
}

export class QueryTemplateDto {
	@IsInt()
	id: number;

	@IsString()
	@MaxLength(200)
	title: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsString()
	content: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	icon?: string;

	@IsBoolean()
	is_global: boolean;

	@IsInt()
	@IsOptional()
	search_space_id?: number;

	@IsUUID()
	created_by_id: string;

	@Type(() => Date)
	created_at: Date;

	@Type(() => Date)
	updated_at: Date;
}
