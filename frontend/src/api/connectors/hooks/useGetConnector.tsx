import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { CONNECTOR } from "@/shared/queryKeys";
import connectorsClientRequests from "../authClientRequests";
import type { Connector } from "../types";

const useGetConnector = (
	id: number | null | undefined,
	options?: UseQueryOptions<Connector, Error>,
) => {
	return useQuery<Connector, Error>({
		queryKey: [CONNECTOR, id],
		queryFn: () => {
			if (!id) {
				throw new Error("Connector ID is required");
			}
			return connectorsClientRequests.getConnector(id);
		},
		enabled: !!id,
		...options,
	});
};

export default useGetConnector;
