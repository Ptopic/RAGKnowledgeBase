import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpace } from "../types";

interface UseGetSearchSpacesOptions {
	q?: string;
	queryOptions?: Omit<
		UseQueryOptions<SearchSpace[], Error, SearchSpace[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>;
}

const useGetSearchSpaces = ({ q, queryOptions }: UseGetSearchSpacesOptions = {}) => {
	return useQuery<SearchSpace[], Error>({
		queryKey: [SEARCH_SPACES, q],
		queryFn: () => searchSpacesClientRequests.getSearchSpaces(q),
		...queryOptions,
	});
};

export default useGetSearchSpaces;
