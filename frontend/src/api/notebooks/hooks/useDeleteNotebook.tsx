import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { NOTEBOOKS } from "@/shared/queryKeys";
import notebooksClientRequests from "../authClientRequests";

interface DeleteNotebookParams {
	searchSpaceId: number;
	notebookId: number;
}

const useDeleteNotebook = (
	options?: UseMutationOptions<void, Error, DeleteNotebookParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, notebookId }: DeleteNotebookParams) =>
			notebooksClientRequests.deleteNotebook(searchSpaceId, notebookId),
		onSuccess: () => {
			toast.success("Notebook deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [NOTEBOOKS] });
		},
		onError: (error) => {
			console.error("Error deleting notebook:", error);
			toast.error(error.message || "An error occurred while deleting the notebook");
		},
		...options,
	});
};

export default useDeleteNotebook;
