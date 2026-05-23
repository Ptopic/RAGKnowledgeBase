import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { LOGS, LOGS_SUMMARY } from "@/shared/queryKeys";
import logsClientRequests from "../authClientRequests";

interface DeleteLogParams {
	id: number;
	searchSpaceId: number;
}

const useDeleteLog = (
	options?: UseMutationOptions<void, Error, DeleteLogParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: DeleteLogParams) =>
			logsClientRequests.deleteLog(id, searchSpaceId),
		onSuccess: () => {
			toast.success("Log deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [LOGS] });
			queryClient.invalidateQueries({ queryKey: [LOGS_SUMMARY] });
		},
		onError: (error) => {
			console.error("Error deleting log:", error);
			toast.error(error.message || "Failed to delete log");
		},
		...options,
	});
};

export default useDeleteLog;
