import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import logsClientRequests from "../authClientRequests";
import type { GetLogsParams, Log } from "../types";

const useGetLogs = (
	params: GetLogsParams | null,
	options?: Omit<
		UseQueryOptions<Log[], Error, Log[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<Log[], Error>({
		queryKey: [
			"logs",
			params?.search_space_id,
			params?.level,
			params?.status,
			params?.source,
			params?.start_date,
			params?.end_date,
			params?.skip,
			params?.limit,
		],
		queryFn: () => {
			if (!params) {
				throw new Error("Logs parameters are required");
			}
			return logsClientRequests.getLogs(params);
		},
		enabled: !!params,
		...options,
	});
};

export default useGetLogs;
