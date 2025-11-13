import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { LOGS } from "@/shared/queryKeys";
import logsClientRequests from "../authClientRequests";
import type { Log } from "../types";

const useGetLog = (
	id: number | null,
	options?: Omit<
		UseQueryOptions<Log, Error, Log, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<Log, Error>({
		queryKey: [LOGS, id],
		queryFn: () => {
			if (!id) {
				throw new Error("Log ID is required");
			}
			return logsClientRequests.getLog(id);
		},
		enabled: !!id,
		...options,
	});
};

export default useGetLog;
