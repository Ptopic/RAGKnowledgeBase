import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type {
	CreateSearchSourceConnectorRequest,
	SearchSourceConnector,
} from "../types";

interface CreateSearchSourceConnectorParams {
	data: CreateSearchSourceConnectorRequest;
	searchSpaceId: number;
}

const useCreateSearchSourceConnector = (
	options?: UseMutationOptions<
		SearchSourceConnector,
		Error,
		CreateSearchSourceConnectorParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ data, searchSpaceId }: CreateSearchSourceConnectorParams) =>
			searchSourceConnectorsClientRequests.createSearchSourceConnector(
				data,
				searchSpaceId,
			),
		onSuccess: () => {
			toast.success("Connector created successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_CONNECTORS] });
		},
		onError: (error) => {
			console.error("Error creating search source connector:", error);
			toast.error(error.message || "Failed to create connector");
		},
		...options,
	});
};

export default useCreateSearchSourceConnector;
