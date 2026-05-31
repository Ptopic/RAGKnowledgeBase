import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { ADMIN_METRICS } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";
import type { AdminMetrics } from "../types";

const useGetAdminMetrics = (
	params: { skip?: number; limit?: number; search?: string },
	options?: Omit<
		UseQueryOptions<AdminMetrics, Error, AdminMetrics, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<AdminMetrics, Error>({
		queryKey: [ADMIN_METRICS, params],
		queryFn: () => adminClientRequests.getAdminMetrics(params),
		...options,
	});
};

export default useGetAdminMetrics;
