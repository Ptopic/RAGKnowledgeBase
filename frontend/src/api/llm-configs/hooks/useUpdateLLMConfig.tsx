import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { LLM_CONFIGS } from "@/shared/queryKeys";
import llmConfigsClientRequests from "../authClientRequests";
import type { LLMConfig, UpdateLLMConfig } from "../types";

interface UpdateLLMConfigParams {
	id: number;
	data: UpdateLLMConfig;
}

const useUpdateLLMConfig = (
	options?: UseMutationOptions<
		LLMConfig,
		Error,
		UpdateLLMConfigParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: UpdateLLMConfigParams) =>
			llmConfigsClientRequests.updateLLMConfig(id, data),
		onSuccess: () => {
			toast.success("LLM configuration updated successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [LLM_CONFIGS] });
		},
		onError: (error) => {
			console.error("Error updating LLM configuration:", error);
			toast.error(error.message || "Failed to update LLM configuration");
		},
		...options,
	});
};

export default useUpdateLLMConfig;
