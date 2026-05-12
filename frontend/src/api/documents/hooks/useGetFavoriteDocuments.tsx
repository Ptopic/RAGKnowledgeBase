import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import documentsClientRequests from "../authClientRequests";
import type { Document, FavoriteDocumentsResponse, GetDocumentsParams } from "../types";
import { FAVORITE_DOCUMENTS } from "@/shared/queryKeys";

const useGetFavoriteDocuments = (
	params: GetDocumentsParams,
	options?: Omit<
		UseQueryOptions<
			FavoriteDocumentsResponse,
			Error,
			FavoriteDocumentsResponse,
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<FavoriteDocumentsResponse, Error>({
		queryKey: [
			FAVORITE_DOCUMENTS,
			params.search_space_id,
			params.page,
			params.page_size,
			params.document_types,
		],
		queryFn: () => documentsClientRequests.getFavoriteDocuments(params),
		...options,
	});
};

export default useGetFavoriteDocuments;
