import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_PENDING_INVITATIONS } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";

type CancelInvitationVariables = { searchSpaceId: number; invitationId: number };

const useCancelInvitation = (
	options?: UseMutationOptions<{ message: string }, Error, CancelInvitationVariables, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation<{ message: string }, Error, CancelInvitationVariables, unknown>({
		mutationFn: ({ searchSpaceId, invitationId }) =>
			searchSpacesClientRequests.cancelInvitation(searchSpaceId, invitationId),
		onSuccess: () => {
			toast.success("Invitation cancelled.");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_PENDING_INVITATIONS, variables.searchSpaceId] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to cancel invitation.");
		},
		...options,
	});
};

export default useCancelInvitation;
