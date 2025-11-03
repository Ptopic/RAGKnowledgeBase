import { DocumentType } from '@prisma/client';

export interface SearchOptions {
  queryText: string;
  topK: number;
  userId: string;
  searchSpaceId?: number;
  documentType?: DocumentType;
}

export interface ChunkSearchResult {
  chunk_id: number;
  content: string;
  score: number;
  rank?: number;
  document: {
    id: number;
    title: string;
    document_type: DocumentType | null;
    metadata: any;
  };
}

export interface DocumentSearchResult {
  document_id: number;
  title: string;
  content: string;
  document_type: DocumentType | null;
  metadata: any;
  score: number;
  search_space_id: number;
}

