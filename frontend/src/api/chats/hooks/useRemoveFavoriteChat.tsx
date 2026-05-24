import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CHATS, FAVORITE_CHATS } from "@/shared/queryKeys";
import chatsClientRequests from "../authClientRequests";

interface FavoriteChatParams {
	id: number;
	searchSpaceId: number;
}

const useRemoveFavoriteChat = (
	options?: UseMutationOptions<
		{ id: number; is_favorite: boolean },
		Error,
		FavoriteChatParams,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: FavoriteChatParams) =>
			chatsClientRequests.removeFavoriteChat(id, searchSpaceId),
		onSuccess: () => {
			toast.success("Removed from favorites");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
			queryClient.invalidateQueries({ queryKey: [FAVORITE_CHATS] });
		},
		onError: (error) => {
			console.error("Error removing favorite chat:", error);
			toast.error(error.message || "An error occurred while removing from favorites");
		},
		...options,
	});
};

export default useRemoveFavoriteChat;
