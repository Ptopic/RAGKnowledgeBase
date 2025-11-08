import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import logsClientRequests from "../authClientRequests";

const useDeleteLog = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => logsClientRequests.deleteLog(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["logs"] });
			queryClient.invalidateQueries({ queryKey: ["logsSummary"] });
			toast.success("Log deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting log:", error);
			toast.error(error.message || "Failed to delete log");
		},
		...options,
	});
};

export default useDeleteLog;
