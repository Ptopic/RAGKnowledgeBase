import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { AcceptInvitationRequest } from "../types";

const useAcceptInvitation = (
	options?: UseMutationOptions<{ message: string }, Error, AcceptInvitationRequest, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation<{ message: string }, Error, AcceptInvitationRequest, unknown>({
		mutationFn: (data: AcceptInvitationRequest) =>
			searchSpacesClientRequests.acceptInvitation(data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
		},
		...options,
	});
};

export default useAcceptInvitation;
