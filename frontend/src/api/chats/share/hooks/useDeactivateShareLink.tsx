import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SHARE_LINKS } from "@/shared/queryKeys";
import chatsShareClientRequests from "../authClientRequests";

const useDeactivateShareLink = (
	options?: UseMutationOptions<
		void,
		Error,
		{ chatId: number; linkId: string },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ chatId, linkId }: { chatId: number; linkId: string }) =>
			chatsShareClientRequests.deactivateShareLink(chatId, linkId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SHARE_LINKS] });
		},
		onError: (error) => {
			console.error("Error deactivating share link:", error);
			toast.error(error.message || "An error occurred while deactivating the share link");
		},
		...options,
	});
};

export default useDeactivateShareLink;
