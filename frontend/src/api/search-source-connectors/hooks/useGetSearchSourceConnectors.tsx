import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type {
	GetSearchSourceConnectorsParams,
	SearchSourceConnector,
} from "../types";

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
	>
) => {
	return useQuery<SearchSourceConnector[], Error>({
		queryKey: ["searchSourceConnectors", params?.search_space_id],
		queryFn: () =>
			searchSourceConnectorsClientRequests.getSearchSourceConnectors(
				params || undefined
			),
		...options,
	});
};

export default useGetSearchSourceConnectors;
