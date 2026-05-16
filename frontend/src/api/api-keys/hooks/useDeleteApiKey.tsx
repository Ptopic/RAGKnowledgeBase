import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { USER_API_KEYS, LLM_CONFIGS } from "@/shared/queryKeys";
import apiKeysClientRequests from "../authClientRequests";

const useDeleteApiKey = (
	options?: UseMutationOptions<void, Error, string, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => apiKeysClientRequests.deleteApiKey(id),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [USER_API_KEYS] });
			queryClient.invalidateQueries({ queryKey: [LLM_CONFIGS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete API key");
		},
		...options,
	});
};

export default useDeleteApiKey;
