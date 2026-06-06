import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION_PLAN_LIMITS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { PlanCreditLimitsResponse } from "../types";

/**
 * Fetch the monthly credit limit for every plan from the database
 * (`plan_definitions` table). The admin panel can edit these at runtime
 * — the settings page reads this so the displayed limits always match
 * what the backend actually enforces.
 */
const useGetPlanCreditLimits = (
	options?: Omit<
		UseQueryOptions<PlanCreditLimitsResponse, Error, PlanCreditLimitsResponse, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<PlanCreditLimitsResponse, Error>({
		queryKey: [SUBSCRIPTION_PLAN_LIMITS],
		queryFn: () => subscriptionClientRequests.getPlanCreditLimits(),
		...options,
	});
};

export default useGetPlanCreditLimits;
