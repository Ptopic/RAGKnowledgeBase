export interface InitiateOAuthParams {
	space_id: string;
}

export interface OAuthResponse {
	auth_url: string;
}

export interface ConnectorConfig {
	[key: string]: string;
}

export interface Connector {
	id: number;
	name: string;
	connector_type: string;
	config: ConnectorConfig;
	created_at: string;
	user_id: string;
}

export interface CreateConnectorRequest {
	name: string;
	connector_type: string;
	config: ConnectorConfig;
}

export interface UpdateConnectorRequest {
	name: string;
	connector_type: string;
	config: ConnectorConfig;
}

export interface GetConnectorsParams {
	skip?: number;
	limit?: number;
}
