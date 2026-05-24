import { useQuery } from "@tanstack/react-query";
import { SEARCH_SPACE_PENDING_INVITATIONS } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpaceInvitation } from "../types";

const useGetPendingInvitations = (searchSpaceId: number) => {
	return useQuery<SearchSpaceInvitation[]>({
		queryKey: [SEARCH_SPACE_PENDING_INVITATIONS, searchSpaceId],
		queryFn: () => searchSpacesClientRequests.getPendingInvitations(searchSpaceId),
		enabled: !!searchSpaceId,
	});
};

export default useGetPendingInvitations;
