import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import llmConfigsClientRequests from "../authClientRequests";

const useDeleteLLMConfig = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => llmConfigsClientRequests.deleteLLMConfig(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["llmConfigs"] });
			toast.success("LLM configuration deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting LLM configuration:", error);
			toast.error(error.message || "Failed to delete LLM configuration");
		},
		...options,
	});
};

export default useDeleteLLMConfig;
