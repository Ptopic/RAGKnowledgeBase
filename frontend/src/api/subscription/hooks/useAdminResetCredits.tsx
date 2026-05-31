import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_SUBSCRIPTIONS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";

const useAdminResetCredits = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId }: { userId: string }) =>
			subscriptionClientRequests.adminResetCredits({ userId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_SUBSCRIPTIONS] });
		},
	});
};

export default useAdminResetCredits;
