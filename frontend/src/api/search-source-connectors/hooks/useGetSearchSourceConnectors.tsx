import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type {
	GetSearchSourceConnectorsParams,
	SearchSourceConnector,
} from "../types";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";

const useGetSearchSourceConnectors = (
	params?: GetSearchSourceConnectorsParams | null,
	options?: Omit<
		UseQueryOptions<
			SearchSourceConnector[],
			Error,
			SearchSourceConnector[],
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<SearchSourceConnector[], Error>({
		queryKey: [SEARCH_SPACE_CONNECTORS, params?.search_space_id, params?.name],
		queryFn: () =>
			searchSourceConnectorsClientRequests.getSearchSourceConnectors(
				params || undefined,
			),
		...options,
	});
};

export default useGetSearchSourceConnectors;
