import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import searchSpacesClientRequests from "../authClientRequests";

const useDeleteSearchSpace = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) =>
			searchSpacesClientRequests.deleteSearchSpace(id),
		onSuccess: () => {
			// Invalidate search spaces query to refetch the list
			queryClient.invalidateQueries({ queryKey: ["searchSpaces"] });
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
