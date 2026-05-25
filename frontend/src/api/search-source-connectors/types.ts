export interface SearchSourceConnector {
	id: number;
	name: string;
	connector_type: string;
	is_indexable: boolean;
	last_indexed_at: string | null;
	config: Record<string, any>;
	search_space_id: number;
	user_id?: string;
	created_at?: string;
	periodic_indexing_enabled: boolean;
	indexing_frequency_minutes: number | null;
	next_scheduled_at: string | null;
}

export interface GetSearchSourceConnectorsParams {
	search_space_id?: number;
	name?: string;
}

export interface CreateSearchSourceConnectorRequest {
	name: string;
	connector_type: string;
	is_indexable: boolean;
	last_indexed_at: string | null;
	config: Record<string, any>;
	periodic_indexing_enabled: boolean;
	indexing_frequency_minutes: number | null;
	next_scheduled_at: string | null;
}

export interface UpdateSearchSourceConnectorRequest {
	name?: string;
	connector_type?: string;
	is_indexable?: boolean;
	last_indexed_at?: string | null;
	config?: Record<string, any>;
	periodic_indexing_enabled?: boolean;
	indexing_frequency_minutes?: number | null;
	next_scheduled_at?: string | null;
}

export interface IndexConnectorRequest {
	connector_id: number;
	search_space_id: string | number;
	start_date?: string;
	end_date?: string;
}

export interface IndexConnectorResponse {
	status: string;
	message: string;
	indexed_count?: number;
}
