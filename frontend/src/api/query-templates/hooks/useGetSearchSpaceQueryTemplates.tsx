import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { GetQueryTemplatesParams, ListResponse, QueryTemplate } from "../types";

const useGetSearchSpaceQueryTemplates = (
	params: GetQueryTemplatesParams | null,
	options?: Omit<
		UseQueryOptions<
			ListResponse<QueryTemplate>,
			Error,
			ListResponse<QueryTemplate>,
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<ListResponse<QueryTemplate>, Error>({
		queryKey: [
			QUERY_TEMPLATES,
			params?.search_space_id,
			params?.search,
			params?.skip,
			params?.limit,
		],
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
