import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import documentsClientRequests from "../authClientRequests";

const useDeleteDocument = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => documentsClientRequests.deleteDocument(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents"] });
			queryClient.invalidateQueries({ queryKey: ["searchDocuments"] });
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
