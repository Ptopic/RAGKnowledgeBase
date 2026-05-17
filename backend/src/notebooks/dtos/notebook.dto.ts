import { Type } from "class-transformer";
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

export class CreateNotebookDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	title: string;

	@IsString()
	@IsNotEmpty()
	content: string;

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
	@MaxLength(255)
	title?: string;

	@IsString()
	@IsOptional()
	content?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	excerpt?: string;
}

export class NotebookDto {
	@IsInt()
	id: number;

	@IsString()
	title: string;

	@IsString()
	slug: string;

	@IsString()
	content: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	excerpt?: string;

	@IsInt()
	search_space_id: number;

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
