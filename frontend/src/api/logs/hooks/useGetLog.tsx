import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { LOGS } from "@/shared/queryKeys";
import logsClientRequests from "../authClientRequests";
import type { Log } from "../types";

const useGetLog = (
	id: number | null,
	searchSpaceId: number | null,
	options?: Omit<
		UseQueryOptions<Log, Error, Log, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<Log, Error>({
		queryKey: [LOGS, id, searchSpaceId],
		queryFn: () => {
			if (!id) {
				throw new Error("Log ID is required");
			}
			if (!searchSpaceId) {
				throw new Error("Search Space ID is required");
			}
			return logsClientRequests.getLog(id, searchSpaceId);
		},
		enabled: !!id && !!searchSpaceId,
		...options,
	});
};

export default useGetLog;
