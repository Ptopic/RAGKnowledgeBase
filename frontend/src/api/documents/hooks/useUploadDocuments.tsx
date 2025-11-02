import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import documentsClientRequests from "../authClientRequests";
import type { UploadDocumentsRequest, UploadDocumentsResponse } from "../types";

const useUploadDocuments = (
	options?: UseMutationOptions<
		UploadDocumentsResponse,
		Error,
		UploadDocumentsRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: UploadDocumentsRequest) =>
			documentsClientRequests.uploadDocuments(data),
		onSuccess: () => {
			toast("Upload initiated", {
				description: "Your files are being processed...",
			});
		},
		onError: (error) => {
			console.error("Error uploading documents:", error);
			toast("Upload error", {
				description: `Failed to upload files: ${error.message}`,
			});
		},
		...options,
	});
};

export default useUploadDocuments;
