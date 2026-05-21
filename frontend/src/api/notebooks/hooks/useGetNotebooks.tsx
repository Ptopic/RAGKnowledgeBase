import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { PaginatedNotebooksResponse, GetNotebooksParams } from "../types";
import { NOTEBOOKS } from "@/shared/queryKeys";

const useGetNotebooks = (
	params: GetNotebooksParams,
	options?: Omit<
		UseQueryOptions<PaginatedNotebooksResponse, Error, PaginatedNotebooksResponse, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<PaginatedNotebooksResponse, Error>({
		queryKey: [
			NOTEBOOKS,
			params.search_space_id,
			params.search,
			params.status,
			params.skip,
			params.limit,
		],
		queryFn: () => notebooksClientRequests.getNotebooks(params),
		...options,
	});
};

export default useGetNotebooks;
