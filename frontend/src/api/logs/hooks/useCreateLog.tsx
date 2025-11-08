import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { LOGS, LOGS_SUMMARY } from "@/shared/queryKeys";
import logsClientRequests from "../authClientRequests";
import type { CreateLogRequest, Log } from "../types";

const useCreateLog = (
	options?: UseMutationOptions<Log, Error, CreateLogRequest, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateLogRequest) => logsClientRequests.createLog(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [LOGS] });
			queryClient.invalidateQueries({ queryKey: [LOGS_SUMMARY] });
			toast.success("Log created successfully");
		},
		onError: (error) => {
			console.error("Error creating log:", error);
			toast.error(error.message || "Failed to create log");
		},
		...options,
	});
};

export default useCreateLog;
