import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import apiKeysClientRequests from "../authClientRequests";
import type { UpdateApiKey, UserProviderApiKey } from "../types";
import { USER_API_KEYS } from "@/shared/queryKeys";

const useUpdateApiKey = (
	options?: UseMutationOptions<UserProviderApiKey, Error, { id: string; data: UpdateApiKey }, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateApiKey }) =>
			apiKeysClientRequests.updateApiKey(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [USER_API_KEYS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update API key");
		},
		...options,
	});
};

export default useUpdateApiKey;
