import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import chatsClientRequests from "../authClientRequests";
import type { Chat, GetFavoriteChatsParams } from "../types";
import { FAVORITE_CHATS } from "@/shared/queryKeys";

const useGetFavoriteChats = (
	params: GetFavoriteChatsParams,
	options?: Omit<
		UseQueryOptions<Chat[], Error, Chat[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<Chat[], Error>({
		queryKey: [FAVORITE_CHATS, params.search_space_id],
		queryFn: () => chatsClientRequests.getFavoriteChats(params),
		...options,
	});
};

export default useGetFavoriteChats;
