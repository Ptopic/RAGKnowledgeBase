export type ContentType = "html" | "json";

export interface Notebook {
	id: number;
	title: string;
	slug: string;
	content: string;
	content_type: ContentType;
	excerpt: string | null;
	search_space_id: number;
	author_id: string;
	created_at: string;
	updated_at: string;
}

export interface NotebookListItem {
	id: number;
	title: string;
	slug: string;
	content_type: ContentType;
	excerpt: string | null;
	search_space_id: number;
	author_id: string;
	created_at: string;
	updated_at: string;
}

export interface GetNotebooksParams {
	search_space_id: number;
	skip?: number;
	limit?: number;
}

export interface CreateNotebookRequest {
	title: string;
	content: string;
	content_type?: ContentType;
	excerpt?: string;
	search_space_id: number;
}

export interface UpdateNotebookRequest {
	title?: string;
	content?: string;
	content_type?: ContentType;
	excerpt?: string;
}
