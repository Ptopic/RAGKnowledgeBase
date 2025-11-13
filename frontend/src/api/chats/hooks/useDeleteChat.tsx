import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CHATS } from "@/shared/queryKeys";
import chatsClientRequests from "../authClientRequests";

const useDeleteChat = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => chatsClientRequests.deleteChat(id),
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
