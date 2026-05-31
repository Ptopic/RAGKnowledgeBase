import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_SUBSCRIPTIONS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";

const useAdminOverridePlan = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, plan }: { userId: string; plan: string }) =>
			subscriptionClientRequests.adminOverridePlan({ userId, plan }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
		},
	});
};

export default useAdminOverridePlan;
