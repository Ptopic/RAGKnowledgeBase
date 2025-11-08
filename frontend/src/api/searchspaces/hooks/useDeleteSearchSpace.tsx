import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";

const useDeleteSearchSpace = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) =>
			searchSpacesClientRequests.deleteSearchSpace(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
			toast.success("Search space deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting search space:", error);
			toast.error(
				error.message || "An error occurred while deleting the search space",
			);
		},
		...options,
	});
};

export default useDeleteSearchSpace;
