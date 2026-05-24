import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { DeclineInvitationRequest } from "../types";

const useDeclineInvitation = (
	options?: UseMutationOptions<{ message: string }, Error, DeclineInvitationRequest, unknown>,
) => {
	return useMutation<{ message: string }, Error, DeclineInvitationRequest, unknown>({
		mutationFn: (data: DeclineInvitationRequest) =>
			searchSpacesClientRequests.declineInvitation(data),
		...options,
	});
};

export default useDeclineInvitation;
