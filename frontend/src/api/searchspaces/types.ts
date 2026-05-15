export interface SearchSpace {
	id: number;
	name: string;
	description: string;
	created_at: string;
	user_id: string;
	pinned_query_template_ids: number[];
}

export interface CreateSearchSpaceRequest {
	name: string;
	description: string;
}

export interface CreateSearchSpaceResponse extends SearchSpace {}
