import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { LLM_CONFIGS } from "@/shared/queryKeys";
import llmConfigsClientRequests from "../authClientRequests";

interface DeleteLLMConfigParams {
	id: number;
	searchSpaceId: number;
}

const useDeleteLLMConfig = (
	options?: UseMutationOptions<void, Error, DeleteLLMConfigParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: DeleteLLMConfigParams) =>
			llmConfigsClientRequests.deleteLLMConfig(id, searchSpaceId),
		onSuccess: () => {
			toast.success("LLM configuration deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [LLM_CONFIGS] });
		},
		onError: (error) => {
			console.error("Error deleting LLM configuration:", error);
			toast.error(error.message || "Failed to delete LLM configuration");
		},
		...options,
	});
};

export default useDeleteLLMConfig;
