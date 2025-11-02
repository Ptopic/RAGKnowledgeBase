import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import chatsClientRequests from "../authClientRequests";
import type { UpdateChatRequest } from "../types";

interface UpdateChatParams {
	id: number;
	data: UpdateChatRequest;
}

const useUpdateChat = (
	options?: UseMutationOptions<void, Error, UpdateChatParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: UpdateChatParams) =>
			chatsClientRequests.updateChat(id, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["chats"] });
			queryClient.invalidateQueries({
				queryKey: ["chatDetails", variables.id],
			});
		},
		onError: (error) => {
			console.error("Error updating chat:", error);
		},
		...options,
	});
};

export default useUpdateChat;
