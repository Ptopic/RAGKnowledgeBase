import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTEBOOK, NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { Notebook } from "../types";

interface UnpublishNotebookParams {
	searchSpaceId: number;
	notebookId: number;
}

const useUnpublishNotebook = (
	options?: UseMutationOptions<Notebook, Error, UnpublishNotebookParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, notebookId }: UnpublishNotebookParams) =>
			notebooksClientRequests.unpublishNotebook(searchSpaceId, notebookId),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: [NOTEBOOKS] });
			queryClient.invalidateQueries({
				queryKey: [NOTEBOOK, variables.searchSpaceId, variables.notebookId],
			});
			toast.success("Notebook unpublished");
		},
		onError: (error) => {
			console.error("Error unpublishing notebook:", error);
			toast.error("Failed to unpublish notebook");
		},
		...options,
	});
};

export default useUnpublishNotebook;
