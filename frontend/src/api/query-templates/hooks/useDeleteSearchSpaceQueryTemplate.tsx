import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";

const useDeleteSearchSpaceQueryTemplate = (
	options?: UseMutationOptions<
		void,
		Error,
		{ searchSpaceId: number; id: number },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, id }) =>
			queryTemplatesClientRequests.deleteSearchSpaceQueryTemplate(
				searchSpaceId,
				id,
			),
		onSuccess: () => {
			toast.success("Query template deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
		},
		onError: (error) => {
			console.error("Error deleting query template:", error);
			toast.error(error.message || "Failed to delete query template");
		},
		...options,
	});
};

export default useDeleteSearchSpaceQueryTemplate;
