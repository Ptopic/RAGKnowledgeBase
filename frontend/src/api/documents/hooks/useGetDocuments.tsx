import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import documentsClientRequests from "../authClientRequests";
import type { Document, GetDocumentsParams, ListResponse } from "../types";

const useGetDocuments = (
	params: GetDocumentsParams,
	options?: Omit<
		UseQueryOptions<
			ListResponse<Document>,
			Error,
			ListResponse<Document>,
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<ListResponse<Document>, Error>({
		queryKey: [
			"documents",
			params.search_space_id,
			params.page,
			params.page_size,
			params.document_types,
		],
		queryFn: () => documentsClientRequests.getDocuments(params),
		...options,
	});
};

export default useGetDocuments;
