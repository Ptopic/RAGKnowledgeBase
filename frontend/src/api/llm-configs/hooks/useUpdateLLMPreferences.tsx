import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { LLM_PREFERENCES } from "@/shared/queryKeys";
import llmConfigsClientRequests from "../authClientRequests";
import type { LLMPreferences, UpdateLLMPreferencesParams } from "../types";

const useUpdateLLMPreferences = (
	options?: UseMutationOptions<
		LLMPreferences,
		Error,
		UpdateLLMPreferencesParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: UpdateLLMPreferencesParams) =>
			llmConfigsClientRequests.updateLLMPreferences(params),
		onSuccess: () => {
			toast.success("LLM preferences updated successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [LLM_PREFERENCES] });
		},
		onError: (error) => {
			console.error("Error updating LLM preferences:", error);
			toast.error(error.message || "Failed to update LLM preferences");
		},
		...options,
	});
};

export default useUpdateLLMPreferences;
