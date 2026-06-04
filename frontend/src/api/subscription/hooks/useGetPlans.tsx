import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION_PLANS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { PlanInfo } from "../types";

const useGetPlans = (
	options?: Omit<
		UseQueryOptions<PlanInfo[], Error, PlanInfo[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<PlanInfo[], Error>({
		queryKey: [SUBSCRIPTION_PLANS],
		queryFn: () => subscriptionClientRequests.getPlans(),
		...options,
	});
};

export default useGetPlans;
