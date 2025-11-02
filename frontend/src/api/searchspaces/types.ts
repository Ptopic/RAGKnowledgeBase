export interface SearchSpace {
	id: number;
	name: string;
	description: string;
	created_at: string;
	user_id: string;
}

export interface CreateSearchSpaceRequest {
	name: string;
	description: string;
}

export interface CreateSearchSpaceResponse extends SearchSpace {}
