import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { DOCUMENT_BY_CHUNKS, DOCUMENTS } from "@/shared/queryKeys";
import documentsClientRequests from "../authClientRequests";

const useDeleteDocument = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => documentsClientRequests.deleteDocument(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
			queryClient.invalidateQueries({ queryKey: [DOCUMENT_BY_CHUNKS] });
			toast.success("Document deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting document:", error);
			toast.error(error.message || "Failed to delete document");
		},
		...options,
	});
};

export default useDeleteDocument;
