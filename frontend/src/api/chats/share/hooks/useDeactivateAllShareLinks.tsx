import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SHARE_LINKS } from "@/shared/queryKeys";
import chatsShareClientRequests from "../authClientRequests";

const useDeactivateAllShareLinks = (
	options?: UseMutationOptions<
		void,
		Error,
		number,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (chatId: number) =>
			chatsShareClientRequests.deactivateAllShareLinks(chatId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SHARE_LINKS] });
		},
		onError: (error) => {
			console.error("Error deactivating share links:", error);
			toast.error(error.message || "An error occurred while deactivating share links");
		},
		...options,
	});
};

export default useDeactivateAllShareLinks;
