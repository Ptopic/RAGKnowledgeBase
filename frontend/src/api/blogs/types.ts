export type ContentType = "html" | "json";

export interface Blog {
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

export interface BlogListItem {
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

export interface GetBlogsParams {
	search_space_id: number;
	skip?: number;
	limit?: number;
}

export interface CreateBlogRequest {
	title: string;
	content: string;
	content_type?: ContentType;
	excerpt?: string;
	search_space_id: number;
}

export interface UpdateBlogRequest {
	title?: string;
	content?: string;
	content_type?: ContentType;
	excerpt?: string;
}
