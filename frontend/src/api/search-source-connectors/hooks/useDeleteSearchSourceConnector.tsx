import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";
import searchSourceConnectorsClientRequests from "../authClientRequests";

const useDeleteSearchSourceConnector = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) =>
			searchSourceConnectorsClientRequests.deleteSearchSourceConnector(id),
		onSuccess: () => {
			toast.success("Connector deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_CONNECTORS] });
		},
		onError: (error) => {
			console.error("Error deleting search source connector:", error);
			toast.error(error.message || "Failed to delete connector");
		},
		...options,
	});
};

export default useDeleteSearchSourceConnector;
