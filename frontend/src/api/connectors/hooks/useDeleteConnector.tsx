import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import connectorsClientRequests from "../authClientRequests";

const useDeleteConnector = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => connectorsClientRequests.deleteConnector(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["connectors"] });
			queryClient.invalidateQueries({ queryKey: ["connector", id] });
			toast.success("Connector deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting connector:", error);
			toast.error(error.message || "Failed to delete connector");
		},
		...options,
	});
};

export default useDeleteConnector;
