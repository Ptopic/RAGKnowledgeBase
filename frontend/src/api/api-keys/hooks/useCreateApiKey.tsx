import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import apiKeysClientRequests from "../authClientRequests";
import type { CreateApiKey, UserProviderApiKey } from "../types";
import { USER_API_KEYS, LLM_CONFIGS } from "@/shared/queryKeys";

const useCreateApiKey = (
	options?: UseMutationOptions<UserProviderApiKey, Error, CreateApiKey, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateApiKey) =>
			apiKeysClientRequests.createApiKey(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [USER_API_KEYS] });
			queryClient.invalidateQueries({ queryKey: [LLM_CONFIGS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to save API key");
		},
		...options,
	});
};

export default useCreateApiKey;
