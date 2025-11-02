import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import documentsClientRequests from "../authClientRequests";
import type { DocumentTypeCount, GetDocumentTypeCountsParams } from "../types";

const useGetDocumentTypeCounts = (
	params?: GetDocumentTypeCountsParams,
	options?: Omit<
		UseQueryOptions<
			DocumentTypeCount[],
			Error,
			DocumentTypeCount[],
			readonly unknown[]
		>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<DocumentTypeCount[], Error>({
		queryKey: ["documentTypeCounts", params?.search_space_id],
		queryFn: () => documentsClientRequests.getDocumentTypeCounts(params),
		...options,
	});
};

export default useGetDocumentTypeCounts;
