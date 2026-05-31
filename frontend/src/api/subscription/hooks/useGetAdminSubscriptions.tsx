import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { ADMIN_SUBSCRIPTIONS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { AdminSubscriptionList } from "../types";

const useGetAdminSubscriptions = (
	params: { skip?: number; limit?: number; search?: string },
	options?: Omit<
		UseQueryOptions<AdminSubscriptionList, Error, AdminSubscriptionList, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<AdminSubscriptionList, Error>({
		queryKey: [ADMIN_SUBSCRIPTIONS, params],
		queryFn: () => subscriptionClientRequests.getAdminSubscriptions(params),
		...options,
	});
};

export default useGetAdminSubscriptions;
