import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { SEARCH_SPACE_MEMBERS } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";

const useRemoveMember = (
	options?: UseMutationOptions<void, Error, { searchSpaceId: number; memberId: string }, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, memberId }: { searchSpaceId: number; memberId: string }) =>
			searchSpacesClientRequests.removeMember(searchSpaceId, memberId),
		onSuccess: () => {
			toast.success("Member removed successfully");
		},
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACE_MEMBERS, variables.searchSpaceId] });
		},
		onError: (error) => {
			console.error("Error removing member:", error);
			toast.error(
				error.message || "An error occurred while removing the member",
			);
		},
		...options,
	});
};

export default useRemoveMember;
