import { useQuery } from "@tanstack/react-query";
import { SHARED_CHAT } from "@/shared/queryKeys";
import chatsShareClientRequests from "../authClientRequests";
import type { SharedChat } from "../types";

const useGetSharedChat = (slug: string | undefined) => {
	return useQuery<SharedChat>({
		queryKey: [SHARED_CHAT, slug],
		queryFn: () => chatsShareClientRequests.getSharedChat(slug!),
		enabled: !!slug,
		retry: false,
	});
};

export default useGetSharedChat;
