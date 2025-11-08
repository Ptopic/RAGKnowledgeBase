import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type { IndexConnectorRequest, IndexConnectorResponse } from "../types";
import { SEARCH_SOURCE_CONNECTORS } from "@/shared/queryKeys";

const useIndexConnector = (
	options?: UseMutationOptions<
		IndexConnectorResponse,
		Error,
		IndexConnectorRequest,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: IndexConnectorRequest) =>
			searchSourceConnectorsClientRequests.indexConnector(params),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SOURCE_CONNECTORS] });
			toast.success(data.message || "Connector content indexed successfully");
		},
		onError: (error) => {
			console.error("Error indexing connector content:", error);
			toast.error(error.message || "Failed to index connector content");
		},
		...options,
	});
};

export default useIndexConnector;
