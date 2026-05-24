import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { SearchSpaceInvitation } from "../types";

const useGetInvitationByToken = (
	token: string | null,
	options?: Omit<UseQueryOptions<SearchSpaceInvitation, Error>, "queryKey" | "queryFn">,
) => {
	return useQuery<SearchSpaceInvitation, Error>({
		queryKey: ["invitation", token],
		queryFn: () => searchSpacesClientRequests.getInvitationByToken(token!),
		enabled: !!token,
		...options,
	});
};

export default useGetInvitationByToken;
