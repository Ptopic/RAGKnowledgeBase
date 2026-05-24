import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_MEMBERS, SEARCH_SPACE_PENDING_INVITATIONS, SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { CreateInvitationRequest, SearchSpaceInvitation } from "../types";

type CreateInvitationVariables = { searchSpaceId: number } & CreateInvitationRequest;

const useCreateInvitation = (
	options?: UseMutationOptions<SearchSpaceInvitation, Error, CreateInvitationVariables, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation<SearchSpaceInvitation, Error, CreateInvitationVariables, unknown>({
		mutationFn: ({ searchSpaceId, ...data }) =>
			searchSpacesClientRequests.createInvitation(searchSpaceId, data),
		onSuccess: () => {
			toast.success("Invitation sent! The recipient must accept before gaining access.");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_MEMBERS, variables.searchSpaceId] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_PENDING_INVITATIONS, variables.searchSpaceId] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to send invitation.");
		},
		...options,
	});
};

export default useCreateInvitation;
