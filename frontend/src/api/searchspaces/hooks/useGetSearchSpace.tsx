import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpace } from "../types";
import { SEARCH_SPACE } from "@/shared/queryKeys";

const useGetSearchSpace = (
	id: number | null,
	options?: Omit<
		UseQueryOptions<SearchSpace, Error, SearchSpace, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<SearchSpace, Error>({
		queryKey: [SEARCH_SPACE, id],
		queryFn: () => {
			if (!id) {
				throw new Error("Search space ID is required");
			}
			return searchSpacesClientRequests.getSearchSpace(id);
		},
		enabled: !!id,
		...options,
	});
};

export default useGetSearchSpace;
