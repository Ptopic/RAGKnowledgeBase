import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CONNECTOR, CONNECTORS } from "@/shared/queryKeys";
import connectorsClientRequests from "../authClientRequests";

const useDeleteConnector = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => connectorsClientRequests.deleteConnector(id),
		onSuccess: () => {
			toast.success("Connector deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CONNECTORS] });
			queryClient.invalidateQueries({ queryKey: [CONNECTOR] });
		},
		onError: (error) => {
			console.error("Error deleting connector:", error);
			toast.error(error.message || "Failed to delete connector");
		},
		...options,
	});
};

export default useDeleteConnector;
