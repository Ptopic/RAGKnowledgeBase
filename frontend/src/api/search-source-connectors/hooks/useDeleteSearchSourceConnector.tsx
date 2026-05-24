import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";
import searchSourceConnectorsClientRequests from "../authClientRequests";

interface DeleteSearchSourceConnectorParams {
	id: number;
	searchSpaceId: number;
}

const useDeleteSearchSourceConnector = (
	options?: UseMutationOptions<void, Error, DeleteSearchSourceConnectorParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: DeleteSearchSourceConnectorParams) =>
			searchSourceConnectorsClientRequests.deleteSearchSourceConnector(id, searchSpaceId),
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
