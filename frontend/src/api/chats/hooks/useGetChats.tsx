import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import chatsClientRequests from "../authClientRequests";
import type { Chat, GetChatsParams } from "../types";

const useGetChats = (
	params: GetChatsParams,
	options?: Omit<
		UseQueryOptions<Chat[], Error, Chat[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>
) => {
	return useQuery<Chat[], Error>({
		queryKey: ["chats", params.search_space_id],
		queryFn: () => chatsClientRequests.getChats(params),
		...options,
	});
};

export default useGetChats;
