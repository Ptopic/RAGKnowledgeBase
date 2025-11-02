import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import chatsClientRequests from "../authClientRequests";
import type { ChatDetails } from "../types";

const useGetChatDetails = (
	id: number | null | undefined,
	options?: UseQueryOptions<ChatDetails, Error>,
) => {
	return useQuery<ChatDetails, Error>({
		queryKey: ["chatDetails", id],
		queryFn: () => {
			if (!id) {
				throw new Error("Chat ID is required");
			}
			return chatsClientRequests.getChatDetails(id);
		},
		enabled: !!id,
		...options,
	});
};

export default useGetChatDetails;
