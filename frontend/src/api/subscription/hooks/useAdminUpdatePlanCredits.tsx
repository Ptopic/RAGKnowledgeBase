import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_PLANS, ADMIN_SUBSCRIPTIONS, SUBSCRIPTION_PLAN_LIMITS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { UpdatePlanCreditsPayload } from "../types";

const useAdminUpdatePlanCredits = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: UpdatePlanCreditsPayload) =>
			subscriptionClientRequests.adminUpdatePlanCredits(payload),
		onSuccess: () => {
			// Refresh the plan list and the user subscription table — the
			// user table shows `monthly_credit_limit` per row so it must
			// refetch when a tier's limit changes. Also invalidate the
			// public plan-limits cache so the user settings page picks
			// up the new limit on next render.
			queryClient.invalidateQueries({ queryKey: [ADMIN_PLANS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
			queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_PLAN_LIMITS] });
		},
	});
};

export default useAdminUpdatePlanCredits;
