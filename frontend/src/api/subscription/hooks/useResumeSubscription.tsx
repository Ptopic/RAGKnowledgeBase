import { useMutation, useQueryClient } from "@tanstack/react-query";
import subscriptionClientRequests from "../authClientRequests";
import type { ResumeSubscriptionResponse } from "../types";
import { SUBSCRIPTION } from "@/shared/queryKeys";

const useResumeSubscription = () => {
	const queryClient = useQueryClient();

	return useMutation<ResumeSubscriptionResponse, Error, void>({
		mutationFn: () => subscriptionClientRequests.resumeSubscription(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION] });
		},
	});
};

export default useResumeSubscription;
