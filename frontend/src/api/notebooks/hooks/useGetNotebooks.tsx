import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { GetNotebooksParams, PaginatedNotebooksResponse } from "../types";

const useGetNotebooks = (
	params: GetNotebooksParams,
	options?: Omit<
		UseQueryOptions<
			PaginatedNotebooksResponse,
			Error,
			PaginatedNotebooksResponse,
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<PaginatedNotebooksResponse, Error>({
		queryKey: [
			NOTEBOOKS,
			params.search_space_id,
			params.search,
			params.status,
			params.sort,
			params.sortDir,
			params.skip,
			params.limit,
		],
		queryFn: () => notebooksClientRequests.getNotebooks(params),
		...options,
	});
};

export default useGetNotebooks;
