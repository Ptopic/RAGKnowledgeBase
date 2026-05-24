import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { SEARCH_SPACE_MEMBERS } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { Member } from "../types";

const useGetMembers = (
	searchSpaceId: number | null,
	options?: Omit<
		UseQueryOptions<Member[], Error, Member[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<Member[], Error>({
		queryKey: [SEARCH_SPACE_MEMBERS, searchSpaceId],
		queryFn: () => {
			if (!searchSpaceId) {
				throw new Error("Search space ID is required");
			}
			return searchSpacesClientRequests.getMembers(searchSpaceId);
		},
		enabled: !!searchSpaceId,
		...options,
	});
};

export default useGetMembers;
