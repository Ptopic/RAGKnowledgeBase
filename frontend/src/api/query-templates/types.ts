export interface QueryTemplate {
	id: number;
	title: string;
	description?: string;
	content: string;
	icon?: string;
	is_global: boolean;
	search_space_id?: number;
	created_by_id: string;
	created_at: string;
	updated_at: string;
}

export interface CreateQueryTemplateRequest {
	title: string;
	description?: string;
	content: string;
	icon?: string;
	is_global?: boolean;
	search_space_id?: number;
}

export interface UpdateQueryTemplateRequest {
	title?: string;
	description?: string;
	content?: string;
	icon?: string;
	is_global?: boolean;
}

export interface CreateQueryTemplateResponse extends QueryTemplate {}

export interface GetQueryTemplatesParams {
	search_space_id: number;
}
