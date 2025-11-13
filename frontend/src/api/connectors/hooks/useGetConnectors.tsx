import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import connectorsClientRequests from "../authClientRequests";
import type { Connector, GetConnectorsParams } from "../types";
import { CONNECTORS } from "@/shared/queryKeys";

const useGetConnectors = (
	params?: GetConnectorsParams,
	options?: UseQueryOptions<Connector[], Error>,
) => {
	return useQuery<Connector[], Error>({
		queryKey: [CONNECTORS, params?.skip, params?.limit],
		queryFn: () => connectorsClientRequests.getConnectors(params),
		...options,
	});
};

export default useGetConnectors;
