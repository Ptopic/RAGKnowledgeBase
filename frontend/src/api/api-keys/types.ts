export interface UserProviderApiKey {
	id: string;
	provider: string;
	name: string;
	created_at: string;
}

export interface CreateApiKey {
	provider: string;
	api_key: string;
	name: string;
}

export interface UpdateApiKey {
	api_key?: string;
	name?: string;
}
