import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import chatsClientRequests from "../authClientRequests";
import type { ChatDetails } from "../types";
import { CHAT_DETAILS } from "@/shared/queryKeys";

const useGetChatDetails = (
	id: number | null | undefined,
	searchSpaceId: number | null | undefined,
	options?: UseQueryOptions<ChatDetails, Error>,
) => {
	return useQuery<ChatDetails, Error>({
		queryKey: [CHAT_DETAILS, id, searchSpaceId],
		queryFn: () => {
			if (!id) {
				throw new Error("Chat ID is required");
			}
			if (!searchSpaceId) {
				throw new Error("Search Space ID is required");
			}
			return chatsClientRequests.getChatDetails(id, searchSpaceId);
		},
		enabled: !!id && !!searchSpaceId,
		...options,
	});
};

export default useGetChatDetails;
