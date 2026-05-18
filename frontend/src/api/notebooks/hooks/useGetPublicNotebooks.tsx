import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { PublicNotebookListItem } from "../types";
import { PUBLIC_NOTEBOOKS } from "@/shared/queryKeys";

const useGetPublicNotebooks = (
	searchSpaceId?: number,
	options?: UseQueryOptions<PublicNotebookListItem[], Error>,
) => {
	return useQuery<PublicNotebookListItem[], Error>({
		queryKey: [PUBLIC_NOTEBOOKS, searchSpaceId],
		queryFn: () => notebooksClientRequests.getPublicNotebooks(searchSpaceId),
		...options,
	});
};

export default useGetPublicNotebooks;
