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

const useAddFavoriteChat = (
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
			chatsClientRequests.addFavoriteChat(id, searchSpaceId),
		onSuccess: () => {
			toast.success("Added to favorites");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
			queryClient.invalidateQueries({ queryKey: [FAVORITE_CHATS] });
		},
		onError: (error) => {
			console.error("Error adding favorite chat:", error);
			toast.error(error.message || "An error occurred while adding to favorites");
		},
		...options,
	});
};

export default useAddFavoriteChat;
