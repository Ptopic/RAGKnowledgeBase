import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTEBOOK, NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { Notebook, UpdateNotebookRequest } from "../types";

interface UpdateNotebookParams {
	searchSpaceId: number;
	notebookId: number;
	data: UpdateNotebookRequest;
}

const useUpdateNotebook = (
	options?: UseMutationOptions<Notebook, Error, UpdateNotebookParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, notebookId, data }: UpdateNotebookParams) =>
			notebooksClientRequests.updateNotebook(searchSpaceId, notebookId, data),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: [NOTEBOOKS] });
			queryClient.invalidateQueries({
				queryKey: [NOTEBOOK, variables.searchSpaceId, variables.notebookId],
			});
		},
		onError: (error) => {
			console.error("Error updating notebook:", error);
			toast.error("Failed to update notebook");
		},
		...options,
	});
};

export default useUpdateNotebook;
