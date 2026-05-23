import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { CHAT_DETAILS, CHATS } from "@/shared/queryKeys";
import chatsClientRequests from "../authClientRequests";
import type { UpdateChatRequest } from "../types";

interface UpdateChatParams {
	id: number;
	searchSpaceId: number;
	data: UpdateChatRequest;
}

const useUpdateChat = (
	options?: UseMutationOptions<void, Error, UpdateChatParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, searchSpaceId, data }: UpdateChatParams) =>
			chatsClientRequests.updateChat(id, searchSpaceId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
			queryClient.invalidateQueries({
				queryKey: [CHAT_DETAILS],
			});
		},
		onError: (error) => {
			console.error("Error updating chat:", error);
		},
		...options,
	});
};

export default useUpdateChat;
