import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import searchSpacesClientRequests from "../authClientRequests";
import type { AcceptInvitationRequest } from "../types";

const useAcceptInvitation = (
	options?: UseMutationOptions<{ message: string }, Error, AcceptInvitationRequest, unknown>,
) => {
	return useMutation<{ message: string }, Error, AcceptInvitationRequest, unknown>({
		mutationFn: (data: AcceptInvitationRequest) =>
			searchSpacesClientRequests.acceptInvitation(data),
		...options,
	});
};

export default useAcceptInvitation;
