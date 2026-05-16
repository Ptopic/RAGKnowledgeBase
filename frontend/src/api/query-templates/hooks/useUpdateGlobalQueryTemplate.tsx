import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { QueryTemplate, UpdateQueryTemplateRequest } from "../types";

const useUpdateGlobalQueryTemplate = (
	options?: UseMutationOptions<
		QueryTemplate,
		Error,
		{ id: number; data: UpdateQueryTemplateRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }) =>
			queryTemplatesClientRequests.updateGlobalQueryTemplate(id, data),
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

export default useUpdateGlobalQueryTemplate;
