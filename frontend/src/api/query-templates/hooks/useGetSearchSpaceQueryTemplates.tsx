import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { GetQueryTemplatesParams, QueryTemplate } from "../types";

const useGetSearchSpaceQueryTemplates = (
	params: GetQueryTemplatesParams | null,
	options?: Omit<
		UseQueryOptions<QueryTemplate[], Error, QueryTemplate[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<QueryTemplate[], Error>({
		queryKey: [QUERY_TEMPLATES, params?.search_space_id],
		queryFn: () => {
			if (!params) {
				throw new Error("Search space ID is required");
			}
			return queryTemplatesClientRequests.getSearchSpaceQueryTemplates(params);
		},
		enabled: !!params,
		...options,
	});
};

export default useGetSearchSpaceQueryTemplates;
