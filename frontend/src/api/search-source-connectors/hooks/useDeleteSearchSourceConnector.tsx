import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import { SEARCH_SOURCE_CONNECTORS } from "@/shared/queryKeys";

const useDeleteSearchSourceConnector = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) =>
			searchSourceConnectorsClientRequests.deleteSearchSourceConnector(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SOURCE_CONNECTORS] });
			toast.success("Connector deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting search source connector:", error);
			toast.error(error.message || "Failed to delete connector");
		},
		...options,
	});
};

export default useDeleteSearchSourceConnector;
