import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CONNECTOR, CONNECTORS } from "@/shared/queryKeys";
import connectorsClientRequests from "../authClientRequests";
import type { Connector, UpdateConnectorRequest } from "../types";

interface UpdateConnectorParams {
	id: number;
	data: UpdateConnectorRequest;
}

const useUpdateConnector = (
	options?: UseMutationOptions<
		Connector,
		Error,
		UpdateConnectorParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: UpdateConnectorParams) =>
			connectorsClientRequests.updateConnector(id, data),
		onSuccess: () => {
			toast.success("Connector updated successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CONNECTORS] });
			queryClient.invalidateQueries({
				queryKey: [CONNECTOR],
			});
		},
		onError: (error) => {
			console.error("Error updating connector:", error);
			toast.error(error.message || "Failed to update connector");
		},
		...options,
	});
};

export default useUpdateConnector;
