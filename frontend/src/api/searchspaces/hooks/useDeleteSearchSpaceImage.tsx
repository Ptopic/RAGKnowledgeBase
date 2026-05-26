import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import searchSpacesClientRequests from "../authClientRequests";
import type { DeleteSearchSpaceImageRequest } from "../types";

const useDeleteSearchSpaceImage = (
	options?: UseMutationOptions<
		{ message: string },
		Error,
		DeleteSearchSpaceImageRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: DeleteSearchSpaceImageRequest) =>
			searchSpacesClientRequests.deleteSearchSpaceImage(data),
		onError: (error) => {
			console.error("[SearchSpaceForm] Image delete error:", error);
			toast.error("Failed to delete image from storage.");
		},
		...options,
	});
};

export default useDeleteSearchSpaceImage;
