import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SHARE_LINKS } from "@/shared/queryKeys";
import chatsShareClientRequests from "../authClientRequests";
import type { CreateShareLinkRequest, ShareLink } from "../types";

const useCreateShareLink = (
	options?: UseMutationOptions<
		ShareLink,
		Error,
		{ chatId: number; data: CreateShareLinkRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ chatId, data }: { chatId: number; data: CreateShareLinkRequest }) =>
			chatsShareClientRequests.createShareLink(chatId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SHARE_LINKS] });
		},
		onError: (error) => {
			console.error("Error creating share link:", error);
			toast.error(error.message || "An error occurred while creating the share link");
		},
		...options,
	});
};

export default useCreateShareLink;
