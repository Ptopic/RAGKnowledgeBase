import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";

const useLeaveSearchSpace = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (searchSpaceId: number) =>
			searchSpacesClientRequests.leaveSearchSpace(searchSpaceId),
		onSuccess: () => {
			toast.success("You have left the search space");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
		},
		onError: (error) => {
			console.error("Error leaving search space:", error);
			toast.error(
				error.message || "An error occurred while leaving the search space",
			);
		},
		...options,
	});
};

export default useLeaveSearchSpace;
