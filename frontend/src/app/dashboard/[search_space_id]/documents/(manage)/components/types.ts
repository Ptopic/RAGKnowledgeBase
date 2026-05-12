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
};

export type ColumnVisibility = {
	title: boolean;
	document_type: boolean;
	content: boolean;
	chunks: boolean;
	created_at: boolean;
	favorite: boolean;
};
