import { useMutation } from "@tanstack/react-query";
import subscriptionClientRequests from "../authClientRequests";
import type { CheckoutSessionResponse } from "../types";

const useCreateCheckoutSession = () => {
	return useMutation({
		mutationFn: (body: { plan: string }) =>
			subscriptionClientRequests.createCheckoutSession(body),
		onSuccess: (data: CheckoutSessionResponse) => {
			if (data.url) {
				window.location.href = data.url;
			}
		},
	});
};

export default useCreateCheckoutSession;
