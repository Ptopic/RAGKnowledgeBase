import { useQuery } from "@tanstack/react-query";
import { SHARE_LINKS } from "@/shared/queryKeys";
import chatsShareClientRequests from "../authClientRequests";
import type { ShareLink } from "../types";

const useGetChatShareLinks = (chatId: number | undefined) => {
	return useQuery<ShareLink[]>({
		queryKey: [SHARE_LINKS, chatId],
		queryFn: () => chatsShareClientRequests.getChatShareLinks(chatId!),
		enabled: !!chatId,
	});
};

export default useGetChatShareLinks;
