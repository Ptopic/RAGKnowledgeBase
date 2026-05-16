import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import apiKeysClientRequests from "../authClientRequests";
import type { UserProviderApiKey } from "../types";
import { USER_API_KEYS } from "@/shared/queryKeys";

const useGetApiKeys = (
	options?: Omit<
		UseQueryOptions<UserProviderApiKey[], Error, UserProviderApiKey[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<UserProviderApiKey[], Error>({
		queryKey: [USER_API_KEYS],
		queryFn: () => apiKeysClientRequests.getApiKeys(),
		...options,
	});
};

export default useGetApiKeys;
