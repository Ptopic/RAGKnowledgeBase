export interface UploadDocumentsRequest {
	files: File[];
	search_space_id: string;
}

export interface UploadDocumentsResponse {
	message?: string;
}

export interface CrawlWebpagesRequest {
	document_type: "CRAWLED_URL";
	content: string[];
	search_space_id: number;
}

export interface CrawlWebpagesResponse {
	message?: string;
}

export interface AddYouTubeVideosRequest {
	document_type: "YOUTUBE_VIDEO";
	content: string[];
	search_space_id: number;
}

export interface AddYouTubeVideosResponse {
	message?: string;
}

export interface Chunk {
	id: number;
	content: string;
	document_id: number;
	created_at: string;
}

export type DocumentType =
	| "CRAWLED_URL"
	| "SLACK_CONNECTOR"
	| "NOTION_CONNECTOR"
	| "FILE"
	| "YOUTUBE_VIDEO"
	| "GITHUB_CONNECTOR"
	| "GOOGLE_CALENDAR_CONNECTOR"
	| "GOOGLE_GMAIL_CONNECTOR";

export interface DocumentWithChunks {
	id: number;
	title: string;
	document_type: DocumentType;
	document_metadata: unknown;
	content: string;
	created_at: string;
	search_space_id: number;
	chunks: Chunk[];
}

export interface DocumentTypeCount {
	type: string;
	count: number;
}

export interface GetDocumentTypeCountsParams {
	search_space_id?: number;
}

export interface Document {
	id: number;
	title: string;
	document_type: DocumentType;
	document_metadata: unknown;
	content: string;
	created_at: string;
	search_space_id: number;
}

export interface GetDocumentsParams {
	search_space_id: number;
	page?: number;
	page_size?: number;
	document_types?: string[];
}

export interface SearchDocumentsParams {
	search_space_id: number;
	title: string;
	page?: number;
	page_size?: number;
	document_types?: string[];
}

export interface ListResponse<T> {
	items: T[];
	total: number;
}
