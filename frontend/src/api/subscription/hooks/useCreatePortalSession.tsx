import { useMutation } from "@tanstack/react-query";
import subscriptionClientRequests from "../authClientRequests";
import type { PortalSessionResponse } from "../types";

const useCreatePortalSession = () => {
	return useMutation({
		mutationFn: () => subscriptionClientRequests.createPortalSession(),
		onSuccess: (data: PortalSessionResponse) => {
			if (data.url) {
				window.location.href = data.url;
			}
		},
	});
};

export default useCreatePortalSession;
