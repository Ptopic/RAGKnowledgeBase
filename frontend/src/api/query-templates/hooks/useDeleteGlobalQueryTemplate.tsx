import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";

const useDeleteGlobalQueryTemplate = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) =>
			queryTemplatesClientRequests.deleteGlobalQueryTemplate(id),
		onSuccess: () => {
			toast.success("Global query template deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
		},
		onError: (error) => {
			console.error("Error deleting global query template:", error);
			toast.error(error.message || "Failed to delete global query template");
		},
		...options,
	});
};

export default useDeleteGlobalQueryTemplate;
