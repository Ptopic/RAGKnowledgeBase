import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import searchSpacesClientRequests from "../authClientRequests";
import type { UploadSearchSpaceImageRequest, UploadSearchSpaceImageResponse } from "../types";

const useUploadSearchSpaceImage = (
	options?: UseMutationOptions<
		UploadSearchSpaceImageResponse,
		Error,
		UploadSearchSpaceImageRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: UploadSearchSpaceImageRequest) =>
			searchSpacesClientRequests.uploadSearchSpaceImage(data),
		onError: (error) => {
			console.error("[SearchSpaceForm] Image upload error:", error);
			toast.error("Failed to upload image.");
		},
		...options,
	});
};

export default useUploadSearchSpaceImage;
