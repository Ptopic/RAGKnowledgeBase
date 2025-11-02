import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import documentsClientRequests from "../authClientRequests";
import type {
	AddYouTubeVideosRequest,
	AddYouTubeVideosResponse,
} from "../types";

const useAddYouTubeVideos = (
	options?: UseMutationOptions<
		AddYouTubeVideosResponse,
		Error,
		AddYouTubeVideosRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: AddYouTubeVideosRequest) =>
			documentsClientRequests.addYouTubeVideos(data),
		onMutate: () => {
			toast("Processing YouTube videos", {
				description: "Your videos are being processed...",
			});
		},
		onSuccess: () => {
			toast("Success", {
				description: "YouTube videos added successfully",
			});
		},
		onError: (error) => {
			console.error("Error adding YouTube videos:", error);
			toast("Error", {
				description: `Failed to process videos: ${error.message}`,
			});
		},
		...options,
	});
};

export default useAddYouTubeVideos;
