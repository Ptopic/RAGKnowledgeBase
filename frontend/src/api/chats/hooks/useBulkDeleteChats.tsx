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
		mutationFn: (params: BulkDeleteChatsParams) =>
			chatsClientRequests.bulkDeleteChats(params),
		onSuccess: (data) => {
			if (data.failed.length === 0) {
				toast.success(`Successfully deleted ${data.deleted.length} chat(s)`);
			} else if (data.deleted.length > 0) {
				toast.warning(`Deleted ${data.deleted.length} chat(s), but ${data.failed.length} could not be deleted`);
			} else {
				toast.error("Could not delete the selected chat(s)");
			}
		},
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
