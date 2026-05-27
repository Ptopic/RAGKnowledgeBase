export type DocumentType = string;

export type Document = {
	id: number;
	title: string;
	document_type: DocumentType;
	document_metadata: any;
	content: string;
	created_at: string;
	search_space_id: number;
	chunks_count?: number;
	processing_status?: "PROCESSING" | "COMPLETED" | "FAILED";
	processing_started_at?: string;
	processing_completed_at?: string;
};

export type ColumnVisibility = {
	title: boolean;
	document_type: boolean;
	content: boolean;
	chunks: boolean;
	created_at: boolean;
	favorite: boolean;
};
