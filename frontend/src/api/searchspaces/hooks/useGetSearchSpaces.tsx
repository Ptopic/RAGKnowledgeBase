import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpace } from "../types";

const useGetSearchSpaces = (
	options?: Omit<
		UseQueryOptions<SearchSpace[], Error, SearchSpace[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>
) => {
	return useQuery<SearchSpace[], Error>({
		queryKey: ["searchSpaces"],
		queryFn: () => searchSpacesClientRequests.getSearchSpaces(),
		...options,
	});
};

export default useGetSearchSpaces;
