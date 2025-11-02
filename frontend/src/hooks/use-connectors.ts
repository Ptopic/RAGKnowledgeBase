// Re-export types from API

// Re-export hooks from API
export { default as useCreateConnector } from "@/api/connectors/hooks/useCreateConnector";
export { default as useDeleteConnector } from "@/api/connectors/hooks/useDeleteConnector";
export { default as useGetConnector } from "@/api/connectors/hooks/useGetConnector";
export { default as useGetConnectors } from "@/api/connectors/hooks/useGetConnectors";
export { default as useUpdateConnector } from "@/api/connectors/hooks/useUpdateConnector";
export type {
	Connector,
	ConnectorConfig,
	CreateConnectorRequest,
	GetConnectorsParams,
	UpdateConnectorRequest,
} from "@/api/connectors/types";

// Get connector type display name
export const getConnectorTypeDisplay = (type: string): string => {
	const typeMap: Record<string, string> = {
		SERPER_API: "Serper API",
		TAVILY_API: "Tavily API",
		SEARXNG_API: "SearxNG",
	};
	return typeMap[type] || type;
};

import connectorsClientRequests from "@/api/connectors/authClientRequests";
import type {
	Connector,
	CreateConnectorRequest,
	GetConnectorsParams,
} from "@/api/connectors/types";

export const ConnectorService = {
	// Create a new connector
	async createConnector(data: CreateConnectorRequest): Promise<Connector> {
		return connectorsClientRequests.createConnector(data);
	},

	// Get all connectors
	async getConnectors(skip = 0, limit = 100): Promise<Connector[]> {
		const params: GetConnectorsParams = { skip, limit };
		return connectorsClientRequests.getConnectors(params);
	},

	// Get a specific connector
	async getConnector(connectorId: number): Promise<Connector> {
		return connectorsClientRequests.getConnector(connectorId);
	},

	// Update a connector
	async updateConnector(
		connectorId: number,
		data: CreateConnectorRequest,
	): Promise<Connector> {
		return connectorsClientRequests.updateConnector(connectorId, data);
	},

	// Delete a connector
	async deleteConnector(connectorId: number): Promise<void> {
		return connectorsClientRequests.deleteConnector(connectorId);
	},
};
