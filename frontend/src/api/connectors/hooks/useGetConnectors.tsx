import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import connectorsClientRequests from "../authClientRequests";
import type { Connector, GetConnectorsParams } from "../types";

const useGetConnectors = (
	params?: GetConnectorsParams,
	options?: UseQueryOptions<Connector[], Error>,
) => {
	return useQuery<Connector[], Error>({
		queryKey: ["connectors", params?.skip, params?.limit],
		queryFn: () => connectorsClientRequests.getConnectors(params),
		...options,
	});
};

export default useGetConnectors;
