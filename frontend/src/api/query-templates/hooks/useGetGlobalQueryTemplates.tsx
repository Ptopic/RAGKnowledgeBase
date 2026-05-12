import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { QueryTemplate } from "../types";

const useGetGlobalQueryTemplates = (
	options?: Omit<
		UseQueryOptions<QueryTemplate[], Error, QueryTemplate[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<QueryTemplate[], Error>({
		queryKey: [QUERY_TEMPLATES, "global"],
		queryFn: () => queryTemplatesClientRequests.getGlobalQueryTemplates(),
		...options,
	});
};

export default useGetGlobalQueryTemplates;
