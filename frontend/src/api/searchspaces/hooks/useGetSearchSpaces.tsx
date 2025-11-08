import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpace } from "../types";

const useGetSearchSpaces = (
	options?: Omit<
		UseQueryOptions<SearchSpace[], Error, SearchSpace[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<SearchSpace[], Error>({
		queryKey: [SEARCH_SPACES],
		queryFn: () => searchSpacesClientRequests.getSearchSpaces(),
		...options,
	});
};

export default useGetSearchSpaces;
