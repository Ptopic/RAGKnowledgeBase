import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type {
	SearchSourceConnector,
	UpdateSearchSourceConnectorRequest,
} from "../types";
import { SEARCH_SOURCE_CONNECTORS } from "@/shared/queryKeys";

interface UpdateSearchSourceConnectorParams {
	id: number;
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
		mutationFn: ({ id, data }: UpdateSearchSourceConnectorParams) =>
			searchSourceConnectorsClientRequests.updateSearchSourceConnector(
				id,
				data,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SOURCE_CONNECTORS] });
			toast.success("Connector updated successfully");
		},
		onError: (error) => {
			console.error("Error updating search source connector:", error);
			toast.error(error.message || "Failed to update connector");
		},
		...options,
	});
};

export default useUpdateSearchSourceConnector;
