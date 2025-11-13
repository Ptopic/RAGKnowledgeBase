import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import documentsClientRequests from "../authClientRequests";
import type { Document, GetDocumentsParams, ListResponse } from "../types";
import { DOCUMENTS } from "@/shared/queryKeys";

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
			DOCUMENTS,
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
