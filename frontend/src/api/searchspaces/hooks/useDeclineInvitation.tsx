import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { DeclineInvitationRequest } from "../types";

const useDeclineInvitation = (
	options?: UseMutationOptions<{ message: string }, Error, DeclineInvitationRequest, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation<{ message: string }, Error, DeclineInvitationRequest, unknown>({
		mutationFn: (data: DeclineInvitationRequest) =>
			searchSpacesClientRequests.declineInvitation(data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["myInvitations"] });
		},
		...options,
	});
};

export default useDeclineInvitation;
