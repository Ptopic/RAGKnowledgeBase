import { Type } from "class-transformer";
import {
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

export type ContentType = "html" | "json";

export class CreateNotebookDto {
	@IsString()
	title: string;

	@IsString()
	content: string;

	@IsEnum(["html", "json"] as const)
	@IsOptional()
	contentType?: ContentType;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	excerpt?: string;

	@IsInt()
	search_space_id: number;
}

export class UpdateNotebookDto {
	@IsString()
	@IsOptional()
	title?: string;

	@IsString()
	@IsOptional()
	content?: string;

	@IsEnum(["html", "json"] as const)
	@IsOptional()
	contentType?: ContentType;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	excerpt?: string;
}

export class NotebookDto extends CreateNotebookDto {
	@IsInt()
	id: number;

	@IsString()
	slug: string;

	@IsString()
	author_id: string;

	@Type(() => Date)
	created_at: Date;

	@Type(() => Date)
	updated_at: Date;
}

export class NotebookListItemDto {
	@IsInt()
	id: number;

	@IsString()
	title: string;

	@IsString()
	slug: string;

	@IsEnum(["html", "json"] as const)
	contentType: ContentType;

	@IsString()
	@IsOptional()
	excerpt?: string;

	@IsString()
	author_id: string;

	@IsInt()
	search_space_id: number;

	@Type(() => Date)
	created_at: Date;

	@Type(() => Date)
	updated_at: Date;
}
