import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_MEMBERS, SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { InviteMemberRequest, InviteResponse } from "../types";

const useInviteMember = (
	options?: UseMutationOptions<InviteResponse, Error, { searchSpaceId: number; data: InviteMemberRequest }, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, data }: { searchSpaceId: number; data: InviteMemberRequest }) =>
			searchSpacesClientRequests.inviteMember(searchSpaceId, data),
		onSuccess: () => {
			toast.success("Invite sent. If the user exists, they will be added to this search space.");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_MEMBERS, variables.searchSpaceId] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
		},
		onError: () => {
			toast.error("An unexpected error occurred. Please try again.");
		},
		...options,
	});
};

export default useInviteMember;
