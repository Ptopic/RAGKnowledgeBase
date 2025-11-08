import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import chatsClientRequests from "../authClientRequests";
import type { CreateChatRequest, CreateChatResponse } from "../types";

const useCreateChat = (
	options?: UseMutationOptions<
		CreateChatResponse,
		Error,
		CreateChatRequest,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateChatRequest) =>
			chatsClientRequests.createChat(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
		onError: (error) => {
			console.error("Error creating chat:", error);
			toast.error(error.message || "An error occurred while creating the chat");
		},
		...options,
	});
};

export default useCreateChat;
