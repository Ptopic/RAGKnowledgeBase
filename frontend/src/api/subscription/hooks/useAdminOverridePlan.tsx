import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_SUBSCRIPTIONS, SUBSCRIPTION } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";

const useAdminOverridePlan = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, plan }: { userId: string; plan: string }) =>
			subscriptionClientRequests.adminOverridePlan({ userId, plan }),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
			// Also refetch the affected user's subscription so any open
			// session (including the admin's own) picks up the new plan.
			queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION] });
			queryClient.invalidateQueries({
				queryKey: [SUBSCRIPTION, variables.userId],
			});
		},
	});
};

export default useAdminOverridePlan;
