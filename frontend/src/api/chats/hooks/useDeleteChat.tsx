import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import chatsClientRequests from "../authClientRequests";
import { CHATS } from "@/shared/queryKeys";

const useDeleteChat = (
	options?: UseMutationOptions<void, Error, number, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => chatsClientRequests.deleteChat(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
				toast.success("Chat deleted successfully");
		},
		onError: (error) => {
			console.error("Error deleting chat:", error);
			toast.error(error.message || "An error occurred while deleting the chat");
		},
		...options,
	});
};

export default useDeleteChat;
