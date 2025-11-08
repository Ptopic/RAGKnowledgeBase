import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import llmConfigsClientRequests from "../authClientRequests";
import type { LLMPreferences, UpdateLLMPreferencesParams } from "../types";
import { LLM_PREFERENCES } from "@/shared/queryKeys";

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
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [LLM_PREFERENCES, variables.search_space_id],
			});
			toast.success("LLM preferences updated successfully");
		},
		onError: (error) => {
			console.error("Error updating LLM preferences:", error);
			toast.error(error.message || "Failed to update LLM preferences");
		},
		...options,
	});
};

export default useUpdateLLMPreferences;
