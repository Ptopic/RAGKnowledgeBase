import { useMutation, useQueryClient } from "@tanstack/react-query";
import subscriptionClientRequests from "../authClientRequests";
import type { CancelSubscriptionResponse, SubscriptionInfo } from "../types";
import { SUBSCRIPTION } from "@/shared/queryKeys";

const useCancelSubscription = () => {
	const queryClient = useQueryClient();

	return useMutation<CancelSubscriptionResponse, Error, void>({
		mutationFn: () => subscriptionClientRequests.cancelSubscription(),
		onSuccess: (result) => {
			queryClient.setQueryData<SubscriptionInfo | undefined>(
				[SUBSCRIPTION],
				(current) => (current ? { ...current, cancel_at: result.cancel_at } : current),
			);
		},
	});
};

export default useCancelSubscription;
