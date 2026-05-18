import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import notebooksClientRequests from "../authClientRequests";
import type { DeleteNotebookImageRequest } from "../types";

const useDeleteNotebookImage = (
	options?: UseMutationOptions<{ message: string }, Error, DeleteNotebookImageRequest, unknown>,
) => {
	return useMutation({
		mutationFn: (data: DeleteNotebookImageRequest) =>
			notebooksClientRequests.deleteNotebookImage(data),
		onError: (error) => {
			console.error("[NotebookEditor] Image delete error:", error);
			toast.error("Failed to delete image from storage.");
		},
		...options,
	});
};

export default useDeleteNotebookImage;
