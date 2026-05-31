import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PREFERENCES } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { PreferencesInfo } from "../types";

const useUpdatePreferences = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: { preferred_language: string }) =>
			subscriptionClientRequests.updatePreferences(body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PREFERENCES] });
		},
	});
};

export default useUpdatePreferences;
