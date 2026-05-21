export interface Notebook {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string | null;
	headline_image_url: string | null;
	is_published: boolean;
	published_at: string | null;
	search_space_id: number;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	created_at: string;
	updated_at: string;
}

export interface NotebookListItem {
	id: number;
	title: string;
	slug: string;
	excerpt: string | null;
	headline_image_url: string | null;
	is_published: boolean;
	published_at: string | null;
	search_space_id: number;
	author_id: string;
	created_at: string;
	updated_at: string;
}

export interface PublicNotebookListItem {
	id: number;
	title: string;
	slug: string;
	excerpt: string | null;
	headline_image_url: string | null;
	published_at: string | null;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	search_space_id: number;
	created_at: string;
	updated_at: string;
}

export interface PaginatedPublicNotebooksResponse {
	items: PublicNotebookListItem[];
	total: number;
}

export interface PublicNotebook {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string | null;
	headline_image_url: string | null;
	published_at: string | null;
	author_id: string;
	author_name: string | null;
	author_picture: string | null;
	search_space_id: number;
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
	excerpt?: string;
	search_space_id: number;
	headline_image_url?: string | null;
}

export interface UpdateNotebookRequest {
	title?: string;
	content?: string;
	excerpt?: string;
	headline_image_url?: string | null;
}

export interface UploadNotebookImageRequest {
	searchSpaceId: number;
	file: File;
}

export interface UploadNotebookImageResponse {
	url: string;
}

export interface DeleteNotebookImageRequest {
	searchSpaceId: number;
	url: string;
}
