import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE, SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpace, UpdateSearchSpaceRequest } from "../types";

const useUpdateSearchSpace = (
	options?: UseMutationOptions<
		SearchSpace,
		Error,
		{ id: number; data: UpdateSearchSpaceRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number;
			data: UpdateSearchSpaceRequest;
		}) => searchSpacesClientRequests.updateSearchSpace(id, {
			name: data.name,
			description: data.description,
			headline_image_url: data.headline_image_url,
		}),
		onSuccess: () => {
			toast.success("Search space updated successfully");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE, variables.id] });
		},
		onError: (error) => {
			console.error("Error updating search space:", error);
			toast.error(
				error.message || "An error occurred while updating the search space",
			);
		},
		...options,
	});
};

export default useUpdateSearchSpace;
