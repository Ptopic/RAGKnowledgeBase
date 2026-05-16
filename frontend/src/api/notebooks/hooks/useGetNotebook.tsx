import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { Notebook } from "../types";
import { NOTEBOOK } from "@/shared/queryKeys";

const useGetNotebook = (
	searchSpaceId: number | null | undefined,
	notebookId: number | null | undefined,
	options?: UseQueryOptions<Notebook, Error>,
) => {
	return useQuery<Notebook, Error>({
		queryKey: [NOTEBOOK, searchSpaceId, notebookId],
		queryFn: () => {
			if (!searchSpaceId) {
				throw new Error("Search space ID is required");
			}
			if (!notebookId) {
				throw new Error("Notebook ID is required");
			}
			return notebooksClientRequests.getNotebook(searchSpaceId, notebookId);
		},
		enabled: !!searchSpaceId && !!notebookId,
		...options,
	});
};

export default useGetNotebook;
