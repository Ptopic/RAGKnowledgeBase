import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CONNECTORS } from "@/shared/queryKeys";
import connectorsClientRequests from "../authClientRequests";
import type { Connector, CreateConnectorRequest } from "../types";

const useCreateConnector = (
	options?: UseMutationOptions<
		Connector,
		Error,
		CreateConnectorRequest,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateConnectorRequest) =>
			connectorsClientRequests.createConnector(data),
		onSuccess: () => {
			toast.success("Connector created successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CONNECTORS] });
		},
		onError: (error) => {
			console.error("Error creating connector:", error);
			toast.error(error.message || "Failed to create connector");
		},
		...options,
	});
};

export default useCreateConnector;
