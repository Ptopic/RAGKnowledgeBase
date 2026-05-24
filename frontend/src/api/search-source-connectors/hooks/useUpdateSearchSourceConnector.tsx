import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type {
	SearchSourceConnector,
	UpdateSearchSourceConnectorRequest,
} from "../types";

interface UpdateSearchSourceConnectorParams {
	id: number;
	searchSpaceId: number;
	data: UpdateSearchSourceConnectorRequest;
}

const useUpdateSearchSourceConnector = (
	options?: UseMutationOptions<
		SearchSourceConnector,
		Error,
		UpdateSearchSourceConnectorParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId, data }: UpdateSearchSourceConnectorParams) =>
			searchSourceConnectorsClientRequests.updateSearchSourceConnector(
				id,
				searchSpaceId,
				data,
			),
		onSuccess: () => {
			toast.success("Connector updated successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_CONNECTORS] });
		},
		onError: (error) => {
			console.error("Error updating search source connector:", error);
			toast.error(error.message || "Failed to update connector");
		},
		...options,
	});
};

export default useUpdateSearchSourceConnector;
