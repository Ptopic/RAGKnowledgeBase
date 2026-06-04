import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PREFERENCES } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { PreferencesInfo } from "../types";

const useGetPreferences = (
	options?: Omit<
		UseQueryOptions<PreferencesInfo, Error, PreferencesInfo, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<PreferencesInfo, Error>({
		queryKey: [PREFERENCES],
		queryFn: () => subscriptionClientRequests.getPreferences(),
		...options,
	});
};

export default useGetPreferences;
