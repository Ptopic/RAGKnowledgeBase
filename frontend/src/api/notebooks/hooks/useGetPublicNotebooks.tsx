import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PUBLIC_NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { GetPublicNotebooksParams, PaginatedPublicNotebooksResponse } from "../types";

const useGetPublicNotebooks = (
	params: GetPublicNotebooksParams,
	options?: UseQueryOptions<PaginatedPublicNotebooksResponse, Error>,
) => {
	return useQuery<PaginatedPublicNotebooksResponse, Error>({
		queryKey: [PUBLIC_NOTEBOOKS, params.search_space_id, params.search, params.sort_by, params.sort_order, params.skip, params.limit],
		queryFn: () => notebooksClientRequests.getPublicNotebooks(params),
		...options,
	});
};

export default useGetPublicNotebooks;
