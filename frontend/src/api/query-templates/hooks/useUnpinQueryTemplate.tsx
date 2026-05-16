import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES, SEARCH_SPACE } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";

const useUnpinQueryTemplate = (
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
			queryTemplatesClientRequests.unpinQueryTemplate(searchSpaceId, templateId),
		onSuccess: () => {
			toast.success("Query template unpinned");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE] });
		},
		onError: (error) => {
			console.error("Error unpinning query template:", error);
			toast.error(error.message || "Failed to unpin query template");
		},
		...options,
	});
};

export default useUnpinQueryTemplate;
