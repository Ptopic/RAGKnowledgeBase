import { DocumentType } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsArray,
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator";

export class CreateDocumentsDto {
	@IsEnum(DocumentType)
	document_type: DocumentType;

	@IsArray()
	content: string[];

	@IsInt()
	search_space_id: number;
}

export class UpdateDocumentDto {
	@IsString()
	@IsOptional()
	title?: string;

	@IsString()
	@IsOptional()
	content?: string | null;

	@IsObject()
	@IsOptional()
	document_metadata?: any;
}

export class DocumentDto {
	@IsInt()
	id: number;

	@IsString()
	title: string;

	@IsEnum(DocumentType)
	document_type: DocumentType;

	@IsObject()
	document_metadata: any;

	@IsString()
	@IsOptional()
	content?: string | null;

	@Type(() => Date)
	created_at: Date;

	@IsInt()
	search_space_id: number;

	@IsInt()
	@IsOptional()
	chunks_count?: number;

	@IsString()
	@IsOptional()
	processing_status?: string;

	@Type(() => Date)
	@IsOptional()
	processing_started_at?: Date;

	@Type(() => Date)
	@IsOptional()
	processing_completed_at?: Date;
}

export class DocumentChunkDto {
	@IsInt()
	id: number;

	@IsString()
	content: string;

	@Type(() => Date)
	created_at: Date;

	@IsInt()
	document_id: number;
}

export class DocumentWithChunksDto extends DocumentDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => DocumentChunkDto)
	chunks: DocumentChunkDto[];
}

export class PaginatedResponseDto<T> {
	items: T[];
	total: number;
}

export enum FavoriteStatus {
	FAVORITED = "favorited",
	NON_FAVORITED = "non_favorited",
}

export class BulkDeleteDocumentsDto {
	@IsArray()
	@IsInt({ each: true })
	ids: number[];

	@IsInt()
	search_space_id: number;
}

export class BulkDeleteResultDto {
	deleted: number[];
	failed: Array<{ id: number; reason: string }>;
	message: string;
}

export class GetDocumentsQueryDto {
	@IsOptional()
	@IsString()
	skip?: string;

	@IsOptional()
	@IsString()
	page?: string;

	@IsOptional()
	@IsString()
	page_size?: string;

	@IsOptional()
	@IsString()
	search_space_id?: string;

	@IsOptional()
	@IsString()
	document_types?: string;

	@IsOptional()
	@IsEnum(FavoriteStatus)
	favorite_status?: FavoriteStatus;
}
