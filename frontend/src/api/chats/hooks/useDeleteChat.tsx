import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CHATS } from "@/shared/queryKeys";
import chatsClientRequests from "../authClientRequests";

interface DeleteChatParams {
	id: number;
	searchSpaceId: number;
}

const useDeleteChat = (
	options?: UseMutationOptions<void, Error, DeleteChatParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId }: DeleteChatParams) =>
			chatsClientRequests.deleteChat(id, searchSpaceId),
		onSuccess: () => {
			toast.success("Chat deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
		},
		onError: (error) => {
			console.error("Error deleting chat:", error);
			toast.error(error.message || "An error occurred while deleting the chat");
		},
		...options,
	});
};

export default useDeleteChat;
