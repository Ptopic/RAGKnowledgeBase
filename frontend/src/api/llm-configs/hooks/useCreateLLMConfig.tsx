import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import llmConfigsClientRequests from "../authClientRequests";
import type { CreateLLMConfig, LLMConfig } from "../types";
import { LLM_CONFIGS } from "@/shared/queryKeys";

const useCreateLLMConfig = (
	options?: UseMutationOptions<LLMConfig, Error, CreateLLMConfig, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateLLMConfig) =>
			llmConfigsClientRequests.createLLMConfig(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [LLM_CONFIGS] });
			toast.success("LLM configuration created successfully");
		},
		onError: (error) => {
			console.error("Error creating LLM configuration:", error);
			toast.error(error.message || "Failed to create LLM configuration");
		},
		...options,
	});
};

export default useCreateLLMConfig;
