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
	const trimmedQ = q?.trim() || undefined;
	return useQuery<SearchSpace[], Error>({
		queryKey: trimmedQ ? [SEARCH_SPACES, trimmedQ] : [SEARCH_SPACES],
		queryFn: () => searchSpacesClientRequests.getSearchSpaces(trimmedQ),
		...queryOptions,
	});
};

export default useGetSearchSpaces;
