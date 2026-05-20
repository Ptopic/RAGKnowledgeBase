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

export interface NotebookDto {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string | null;
	is_published: boolean;
	published_at: Date | null;
	search_space_id: number;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	created_at: Date;
	updated_at: Date;
}

export interface NotebookListItemDto {
	id: number;
	title: string;
	slug: string;
	excerpt: string | null;
	is_published: boolean;
	published_at: Date | null;
	author_id: string;
	search_space_id: number;
	created_at: Date;
	updated_at: Date;
}

export interface PublicNotebookListItemDto {
	id: number;
	title: string;
	slug: string;
	excerpt: string | null;
	published_at: Date | null;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	search_space_id: number;
	created_at: Date;
	updated_at: Date;
}

export interface PublicNotebookDto {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string | null;
	published_at: Date | null;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	search_space_id: number;
	created_at: Date;
	updated_at: Date;
}

export interface PaginatedPublicNotebooksResponseDto {
	items: PublicNotebookListItemDto[];
	total: number;
}
