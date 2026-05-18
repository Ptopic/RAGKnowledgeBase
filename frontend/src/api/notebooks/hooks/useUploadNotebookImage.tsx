import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import notebooksClientRequests from "../authClientRequests";
import type { UploadNotebookImageRequest, UploadNotebookImageResponse } from "../types";

const useUploadNotebookImage = (
	options?: UseMutationOptions<UploadNotebookImageResponse, Error, UploadNotebookImageRequest, unknown>,
) => {
	return useMutation({
		mutationFn: (data: UploadNotebookImageRequest) =>
			notebooksClientRequests.uploadNotebookImage(data),
		onError: (error) => {
			console.error("[NotebookEditor] Image upload error:", error);
			toast.error("Image upload failed. Please try again.");
		},
		...options,
	});
};

export default useUploadNotebookImage;
