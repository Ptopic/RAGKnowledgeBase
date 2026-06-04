import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_PLANS, ADMIN_SUBSCRIPTIONS } from "@/shared/queryKeys";
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
			// refetch when a tier's limit changes.
			queryClient.invalidateQueries({ queryKey: [ADMIN_PLANS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
		},
	});
};

export default useAdminUpdatePlanCredits;
