import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { DOCUMENTS, SEARCH_DOCUMENTS } from "@/shared/queryKeys";
import documentsClientRequests from "../authClientRequests";
import type { BulkDeleteDocumentsResponse } from "../types";

interface BulkDeleteDocumentsParams {
	ids: number[];
	searchSpaceId: number;
}

const useBulkDeleteDocuments = (
	options?: UseMutationOptions<
		BulkDeleteDocumentsResponse,
		Error,
		BulkDeleteDocumentsParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ ids, searchSpaceId }: BulkDeleteDocumentsParams) =>
			documentsClientRequests.bulkDeleteDocuments({
				ids,
				search_space_id: searchSpaceId,
			}),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_DOCUMENTS] });
		},
		onError: (error) => {
			console.error("Error bulk deleting documents:", error);
			toast.error(error.message || "Failed to delete documents");
		},
		...options,
	});
};

export default useBulkDeleteDocuments;
