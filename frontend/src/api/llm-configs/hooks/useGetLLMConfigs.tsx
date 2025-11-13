import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import llmConfigsClientRequests from "../authClientRequests";
import type { GetLLMConfigsParams, LLMConfig } from "../types";
import { LLM_CONFIGS } from "@/shared/queryKeys";

const useGetLLMConfigs = (
	params: GetLLMConfigsParams | null,
	options?: Omit<
		UseQueryOptions<LLMConfig[], Error, LLMConfig[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<LLMConfig[], Error>({
		queryKey: [LLM_CONFIGS, params?.search_space_id],
		queryFn: () => {
			if (!params) {
				throw new Error("Search space ID is required");
			}
			return llmConfigsClientRequests.getLLMConfigs(params);
		},
		enabled: !!params,
		...options,
	});
};

export default useGetLLMConfigs;
