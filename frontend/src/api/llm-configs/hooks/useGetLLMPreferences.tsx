import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import llmConfigsClientRequests from "../authClientRequests";
import type { GetLLMPreferencesParams, LLMPreferences } from "../types";

const useGetLLMPreferences = (
	params: GetLLMPreferencesParams | null,
	options?: Omit<
		UseQueryOptions<LLMPreferences, Error, LLMPreferences, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<LLMPreferences, Error>({
		queryKey: ["llmPreferences", params?.search_space_id],
		queryFn: () => {
			if (!params) {
				throw new Error("Search space ID is required");
			}
			return llmConfigsClientRequests.getLLMPreferences(params);
		},
		enabled: !!params,
		...options,
	});
};

export default useGetLLMPreferences;
