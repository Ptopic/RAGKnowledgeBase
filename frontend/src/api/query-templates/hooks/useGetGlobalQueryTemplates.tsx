import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_TEMPLATES } from "@/shared/queryKeys";
import queryTemplatesClientRequests from "../authClientRequests";
import type { GetGlobalQueryTemplatesParams, ListResponse, QueryTemplate } from "../types";

const useGetGlobalQueryTemplates = (
	params?: GetGlobalQueryTemplatesParams,
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
		queryKey: [QUERY_TEMPLATES, "global", params?.search, params?.skip, params?.limit],
		queryFn: () => queryTemplatesClientRequests.getGlobalQueryTemplates(params),
		...options,
	});
};

export default useGetGlobalQueryTemplates;
