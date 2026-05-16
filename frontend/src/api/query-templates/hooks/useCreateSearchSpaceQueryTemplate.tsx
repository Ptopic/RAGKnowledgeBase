import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { CreateQueryTemplateRequest, QueryTemplate } from "../types";

const useCreateSearchSpaceQueryTemplate = (
	options?: UseMutationOptions<
		QueryTemplate,
		Error,
		{ searchSpaceId: number; data: CreateQueryTemplateRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, data }) =>
			queryTemplatesClientRequests.createSearchSpaceQueryTemplate(
				searchSpaceId,
				data,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
			toast.success("Query template created successfully");
		},
		onError: (error) => {
			console.error("Error creating query template:", error);
			toast.error(error.message || "Failed to create query template");
		},
		...options,
	});
};

export default useCreateSearchSpaceQueryTemplate;
