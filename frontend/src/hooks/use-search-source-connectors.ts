import useCreateSearchSourceConnector from "@api/search-source-connectors/hooks/useCreateSearchSourceConnector";
import useDeleteSearchSourceConnector from "@api/search-source-connectors/hooks/useDeleteSearchSourceConnector";
import useGetSearchSourceConnectors from "@api/search-source-connectors/hooks/useGetSearchSourceConnectors";
import useIndexConnector from "@api/search-source-connectors/hooks/useIndexConnector";
import useUpdateSearchSourceConnector from "@api/search-source-connectors/hooks/useUpdateSearchSourceConnector";
import type {
	CreateSearchSourceConnectorRequest,
	GetSearchSourceConnectorsParams,
	UpdateSearchSourceConnectorRequest,
} from "@api/search-source-connectors/types";
import { useCallback, useMemo } from "react";

// Re-export types for backward compatibility
export type { SearchSourceConnector } from "@api/search-source-connectors/types";

export interface ConnectorSourceItem {
	id: number;
	name: string;
	type: string;
	sources: any[];
}

/**
 * Hook to fetch search source connectors from the API
 * @param lazy - If true, connectors won't be fetched on mount
 * @param searchSpaceId - Optional search space ID to filter connectors
 * @param name - Optional name filter for searching connectors by name
 */
export const useSearchSourceConnectors = (
	lazy: boolean = false,
	searchSpaceId?: number,
	name?: string,
) => {
	const params = useMemo(() => {
		const p: GetSearchSourceConnectorsParams = {};
		if (searchSpaceId) p.search_space_id = searchSpaceId;
		if (name) p.name = name;
		return searchSpaceId || name ? p : undefined;
	}, [searchSpaceId, name]);

	// Use the React Query hooks
	const {
		data: connectors = [],
		isLoading,
		error,
		refetch,
	} = useGetSearchSourceConnectors(params, {
		enabled: !lazy, // Only fetch if not lazy
	});

	const createConnectorMutation = useCreateSearchSourceConnector();
	const updateConnectorMutation = useUpdateSearchSourceConnector();
	const deleteConnectorMutation = useDeleteSearchSourceConnector();
	const indexConnectorMutation = useIndexConnector();

	// Compute connector source items from hardcoded defaults + API connectors.
	// useMemo avoids recreating the array on every render and removes the need
	const connectorSourceItems: ConnectorSourceItem[] = useMemo(() => {
		const defaultConnectors: ConnectorSourceItem[] = [
			{
				id: 1,
				name: "Crawled URL",
				type: "CRAWLED_URL",
				sources: [],
			},
			{
				id: 2,
				name: "File",
				type: "FILE",
				sources: [],
			},
			{
				id: 3,
				name: "Youtube Video",
				type: "YOUTUBE_VIDEO",
				sources: [],
			},
		];

		const apiConnectors: ConnectorSourceItem[] = connectors.map(
			(connector, index) => ({
				id: 1000 + index, // Use a high ID to avoid conflicts with hardcoded IDs
				name: connector.name,
				type: connector.connector_type,
				sources: [],
			}),
		);

		return [...defaultConnectors, ...apiConnectors];
	}, [connectors]);

	// Wrapper functions to maintain backward compatibility
	const fetchConnectors = useCallback(async () => {
		const { data } = await refetch();
		return data;
	}, [refetch]);

	const refreshConnectors = useCallback(async () => {
		const { data } = await refetch();
		return data;
	}, [refetch]);

	/**
	 * Create a new search source connector
	 */
	const createConnector = async (
		connectorData: CreateSearchSourceConnectorRequest,
		spaceId: number,
	) => {
		return createConnectorMutation.mutateAsync({
			data: connectorData,
			searchSpaceId: spaceId,
		});
	};

	/**
	 * Update an existing search source connector
	 */
	const updateConnector = async (
		connectorId: number,
		connectorData: UpdateSearchSourceConnectorRequest,
	) => {
		if (!searchSpaceId) throw new Error("Search Space ID is required");
		return updateConnectorMutation.mutateAsync({
			id: connectorId,
			searchSpaceId,
			data: connectorData,
		});
	};

	/**
	 * Delete a search source connector
	 */
	const deleteConnector = async (connectorId: number) => {
		if (!searchSpaceId) throw new Error("Search Space ID is required");
		await deleteConnectorMutation.mutateAsync({ id: connectorId, searchSpaceId });
	};

	/**
	 * Index content from a connector to a search space
	 */
	const indexConnector = async (
		connectorId: number,
		searchSpaceIdParam: string | number,
		startDate?: string,
		endDate?: string,
	) => {
		return indexConnectorMutation.mutateAsync({
			connector_id: connectorId,
			search_space_id: searchSpaceIdParam,
			start_date: startDate,
			end_date: endDate,
		});
	};

	/**
	 * Get connector source items - memoized to prevent unnecessary re-renders
	 */
	const getConnectorSourceItems = useCallback(() => {
		return connectorSourceItems;
	}, [connectorSourceItems]);

	return {
		connectors,
		isLoading,
		isLoaded: !isLoading && !error,
		error: error || null,
		fetchConnectors,
		createConnector,
		updateConnector,
		deleteConnector,
		indexConnector,
		getConnectorSourceItems,
		connectorSourceItems,
		refreshConnectors,
	};
};
