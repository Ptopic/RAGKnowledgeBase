import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import logsClientRequests from "../authClientRequests";
import type { GetLogsSummaryParams, LogSummary } from "../types";

const useGetLogsSummary = (
	params: GetLogsSummaryParams | null,
	options?: Omit<
		UseQueryOptions<LogSummary, Error, LogSummary, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<LogSummary, Error>({
		queryKey: ["logsSummary", params?.search_space_id, params?.hours],
		queryFn: () => {
			if (!params) {
				throw new Error("Search space ID is required");
			}
			return logsClientRequests.getLogsSummary(params);
		},
		enabled: !!params && !!params.search_space_id,
		...options,
	});
};

export default useGetLogsSummary;
