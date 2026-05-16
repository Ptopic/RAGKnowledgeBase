import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { NotebookListItem, GetNotebooksParams } from "../types";
import { NOTEBOOKS } from "@/shared/queryKeys";

const useGetNotebooks = (
	params: GetNotebooksParams,
	options?: Omit<
		UseQueryOptions<NotebookListItem[], Error, NotebookListItem[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<NotebookListItem[], Error>({
		queryKey: [NOTEBOOKS, params.search_space_id],
		queryFn: () => notebooksClientRequests.getNotebooks(params),
		...options,
	});
};

export default useGetNotebooks;
