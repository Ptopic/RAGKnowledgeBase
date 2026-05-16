import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { QueryTemplate, UpdateQueryTemplateRequest } from "../types";

const useUpdateSearchSpaceQueryTemplate = (
	options?: UseMutationOptions<
		QueryTemplate,
		Error,
		{ searchSpaceId: number; id: number; data: UpdateQueryTemplateRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, id, data }) =>
			queryTemplatesClientRequests.updateSearchSpaceQueryTemplate(
				searchSpaceId,
				id,
				data,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
			toast.success("Query template updated successfully");
		},
		onError: (error) => {
			console.error("Error updating query template:", error);
			toast.error(error.message || "Failed to update query template");
		},
		...options,
	});
};

export default useUpdateSearchSpaceQueryTemplate;
