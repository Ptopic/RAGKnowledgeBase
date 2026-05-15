import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES, SEARCH_SPACE } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";

const usePinQueryTemplate = (
	options?: UseMutationOptions<
		{ pinned_query_template_ids: number[] },
		Error,
		{ searchSpaceId: number; templateId: number },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, templateId }) =>
			queryTemplatesClientRequests.pinQueryTemplate(searchSpaceId, templateId),
		onSuccess: () => {
			toast.success("Query template pinned");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE] });
		},
		onError: (error) => {
			console.error("Error pinning query template:", error);
			toast.error(error.message || "Failed to pin query template");
		},
		...options,
	});
};

export default usePinQueryTemplate;
