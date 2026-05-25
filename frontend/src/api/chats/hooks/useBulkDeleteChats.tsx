import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CHATS } from "@/shared/queryKeys";
import chatsClientRequests from "../authClientRequests";
import type { BulkDeleteChatsParams, BulkDeleteChatsResponse } from "../types";

const useBulkDeleteChats = (
	options?: UseMutationOptions<BulkDeleteChatsResponse, Error, BulkDeleteChatsParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ ids, searchSpaceId }: BulkDeleteChatsParams) =>
			chatsClientRequests.bulkDeleteChats(ids, searchSpaceId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [CHATS] });
		},
		onError: (error) => {
			console.error("Error bulk deleting chats:", error);
			toast.error(error.message || "An error occurred while deleting chats");
		},
		...options,
	});
};

export default useBulkDeleteChats;
