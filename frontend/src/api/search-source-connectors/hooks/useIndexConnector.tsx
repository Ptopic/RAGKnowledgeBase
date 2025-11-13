import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_CONNECTORS } from "@/shared/queryKeys";
import searchSourceConnectorsClientRequests from "../authClientRequests";
import type { IndexConnectorRequest, IndexConnectorResponse } from "../types";

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
			toast.success(data.message || "Connector content indexed successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_CONNECTORS] });
		},
		onError: (error) => {
			console.error("Error indexing connector content:", error);
			toast.error(error.message || "Failed to index connector content");
		},
		...options,
	});
};

export default useIndexConnector;
