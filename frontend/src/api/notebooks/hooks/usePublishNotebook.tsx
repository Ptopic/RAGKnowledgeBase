import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTEBOOK, NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { Notebook } from "../types";

interface PublishNotebookParams {
	searchSpaceId: number;
	notebookId: number;
}

const usePublishNotebook = (
	options?: UseMutationOptions<Notebook, Error, PublishNotebookParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, notebookId }: PublishNotebookParams) =>
			notebooksClientRequests.publishNotebook(searchSpaceId, notebookId),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: [NOTEBOOKS] });
			queryClient.invalidateQueries({
				queryKey: [NOTEBOOK, variables.searchSpaceId, variables.notebookId],
			});
			toast.success("Notebook published");
		},
		onError: (error) => {
			console.error("Error publishing notebook:", error);
			toast.error("Failed to publish notebook");
		},
		...options,
	});
};

export default usePublishNotebook;
