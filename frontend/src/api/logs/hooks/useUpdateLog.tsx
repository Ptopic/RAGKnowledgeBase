import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import logsClientRequests from "../authClientRequests";
import type { Log, UpdateLogRequest } from "../types";

interface UpdateLogParams {
	id: number;
	data: UpdateLogRequest;
}

const useUpdateLog = (
	options?: UseMutationOptions<Log, Error, UpdateLogParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: UpdateLogParams) =>
			logsClientRequests.updateLog(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["logs"] });
			queryClient.invalidateQueries({ queryKey: ["logsSummary"] });
			toast.success("Log updated successfully");
		},
		onError: (error) => {
			console.error("Error updating log:", error);
			toast.error(error.message || "Failed to update log");
		},
		...options,
	});
};

export default useUpdateLog;
