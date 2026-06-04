import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_SUBSCRIPTIONS, SUBSCRIPTION } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";

const useAdminResetCredits = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId }: { userId: string }) =>
			subscriptionClientRequests.adminResetCredits({ userId }),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
			// The affected user (or any open session viewing them) needs
			// to refetch — see useAdminOverridePlan for the same pattern.
			queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION] });
			queryClient.invalidateQueries({
				queryKey: [SUBSCRIPTION, variables.userId],
			});
		},
	});
};

export default useAdminResetCredits;
