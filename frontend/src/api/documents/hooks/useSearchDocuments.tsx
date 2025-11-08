import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import documentsClientRequests from "../authClientRequests";
import type { Document, ListResponse, SearchDocumentsParams } from "../types";
import { DOCUMENTS } from "@/shared/queryKeys";

const useSearchDocuments = (
	params: SearchDocumentsParams | null,
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
			params?.search_space_id,
			params?.title,
			params?.page,
			params?.page_size,
			params?.document_types,
		],
		queryFn: () => {
			if (!params) {
				throw new Error("Search parameters are required");
			}
			return documentsClientRequests.searchDocuments(params);
		},
		enabled: !!params && !!params.title.trim(),
		...options,
	});
};

export default useSearchDocuments;
