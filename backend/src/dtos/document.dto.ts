import {
    IsString,
    IsInt,
    IsEnum,
    IsOptional,
    ValidateNested,
    IsArray,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';

export class ExtensionDocumentMetadataDto {
  @IsString()
  BrowsingSessionId: string;

  @IsString()
  VisitedWebPageURL: string;

  @IsString()
  VisitedWebPageTitle: string;

  @IsString()
  VisitedWebPageDateWithTimeInISOString: string;

  @IsString()
  VisitedWebPageReffererURL: string;

  @IsString()
  VisitedWebPageVisitDurationInMilliseconds: string;
}

export class ExtensionDocumentContentDto {
  @ValidateNested()
  @Type(() => ExtensionDocumentMetadataDto)
  metadata: ExtensionDocumentMetadataDto;

  @IsString()
  pageContent: string;
}

export class CreateDocumentsDto {
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @IsArray()
  content: ExtensionDocumentContentDto[] | string[];

  @IsInt()
  search_space_id: number;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

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
  content: string;

  @Type(() => Date)
  createdAt: Date;

  @IsInt()
  search_space_id: number;
}

export class DocumentChunkDto {
  @IsInt()
  id: number;

  @IsString()
  content: string;

  @Type(() => Date)
  createdAt: Date;

  @IsInt()
  documentId: number;
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
