import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { CreateQueryTemplateRequest, QueryTemplate } from "../types";

const useCreateGlobalQueryTemplate = (
	options?: UseMutationOptions<
		QueryTemplate,
		Error,
		CreateQueryTemplateRequest,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateQueryTemplateRequest) =>
			queryTemplatesClientRequests.createGlobalQueryTemplate(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_TEMPLATES] });
			toast.success("Global query template created successfully");
		},
		onError: (error) => {
			console.error("Error creating global query template:", error);
			toast.error(error.message || "Failed to create global query template");
		},
		...options,
	});
};

export default useCreateGlobalQueryTemplate;
