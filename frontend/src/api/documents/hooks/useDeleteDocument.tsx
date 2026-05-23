import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { DOCUMENTS, SEARCH_DOCUMENTS } from "@/shared/queryKeys";
import documentsClientRequests from "../authClientRequests";

interface DeleteDocumentParams {
	id: number;
	searchSpaceId: number;
}

const useDeleteDocument = (
	options?: UseMutationOptions<void, Error, DeleteDocumentParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: DeleteDocumentParams) =>
			documentsClientRequests.deleteDocument(id, searchSpaceId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_DOCUMENTS] });
		},
		onError: (error) => {
			console.error("Error deleting document:", error);
			toast.error(error.message || "Failed to delete document");
		},
		...options,
	});
};

export default useDeleteDocument;
