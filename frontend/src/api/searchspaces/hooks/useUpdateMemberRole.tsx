import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_MEMBERS } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type { Member, UpdateMemberRoleRequest } from "../types";

const useUpdateMemberRole = (
	options?: UseMutationOptions<
		Member,
		Error,
		{ searchSpaceId: number; memberId: string; data: UpdateMemberRoleRequest },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, memberId, data }: { searchSpaceId: number; memberId: string; data: UpdateMemberRoleRequest }) =>
			searchSpacesClientRequests.updateMemberRole(searchSpaceId, memberId, data),
		onSuccess: () => {
			toast.success("Member role updated successfully");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_MEMBERS, variables.searchSpaceId] });
		},
		onError: (error) => {
			console.error("Error updating member role:", error);
			toast.error(
				error.message || "An error occurred while updating the member role",
			);
		},
		...options,
	});
};

export default useUpdateMemberRole;
