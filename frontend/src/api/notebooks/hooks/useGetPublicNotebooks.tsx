import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { PaginatedPublicNotebooksResponse } from "../types";
import { PUBLIC_NOTEBOOKS } from "@/shared/queryKeys";

const useGetPublicNotebooks = (
	searchSpaceId?: number,
	skip?: number,
	limit?: number,
	options?: UseQueryOptions<PaginatedPublicNotebooksResponse, Error>,
) => {
	return useQuery<PaginatedPublicNotebooksResponse, Error>({
		queryKey: [PUBLIC_NOTEBOOKS, searchSpaceId, skip, limit],
		queryFn: () => notebooksClientRequests.getPublicNotebooks(searchSpaceId, skip, limit),
		...options,
	});
};

export default useGetPublicNotebooks;
