import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";
import type { Notebook, CreateNotebookRequest } from "../types";

interface CreateNotebookParams {
	searchSpaceId: number;
	data: Omit<CreateNotebookRequest, "search_space_id">;
}

const useCreateNotebook = (
	options?: UseMutationOptions<Notebook, Error, CreateNotebookParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, data }: CreateNotebookParams) =>
			notebooksClientRequests.createNotebook(searchSpaceId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [NOTEBOOKS] });
		},
		onError: (error) => {
			console.error("Error creating notebook:", error);
			toast.error(error.message || "An error occurred while creating the notebook");
		},
		...options,
	});
};

export default useCreateNotebook;
