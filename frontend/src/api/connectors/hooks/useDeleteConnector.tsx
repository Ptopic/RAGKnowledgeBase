import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import connectorsClientRequests from "../authClientRequests";
import { CONNECTORS } from "@/shared/queryKeys";

const useDeleteConnector = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => connectorsClientRequests.deleteConnector(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: [CONNECTORS] });
			queryClient.invalidateQueries({ queryKey: [CONNECTORS, id] });
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
