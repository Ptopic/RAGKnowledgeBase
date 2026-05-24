import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpaceInvitation } from "../types";

const useGetMyInvitations = (
	options?: Omit<UseQueryOptions<SearchSpaceInvitation[], Error>, "queryKey" | "queryFn">,
) => {
	return useQuery<SearchSpaceInvitation[], Error>({
		queryKey: ["myInvitations"],
		queryFn: () => searchSpacesClientRequests.getMyInvitations(),
		...options,
	});
};

export default useGetMyInvitations;
