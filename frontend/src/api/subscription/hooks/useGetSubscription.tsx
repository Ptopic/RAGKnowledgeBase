import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { SubscriptionInfo } from "../types";

const useGetSubscription = (
	options?: Omit<
		UseQueryOptions<SubscriptionInfo, Error, SubscriptionInfo, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<SubscriptionInfo, Error>({
		queryKey: [SUBSCRIPTION],
		queryFn: () => subscriptionClientRequests.getSubscription(),
		staleTime: 30_000,
		refetchOnWindowFocus: true,
		...options,
	});
};

export default useGetSubscription;
