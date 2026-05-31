import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION, PREFERENCES } from "@/shared/queryKeys";
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
		...options,
	});
};

export default useGetSubscription;
