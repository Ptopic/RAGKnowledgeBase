import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { DOCUMENTS, SEARCH_DOCUMENTS } from "@/shared/queryKeys";
import documentsClientRequests from "../authClientRequests";

interface ToggleFavoriteData {
	documentId: number;
	searchSpaceId: number;
	isFavorite: boolean;
}

const useToggleFavorite = (
	options?: UseMutationOptions<void, Error, ToggleFavoriteData, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ documentId, searchSpaceId, isFavorite }: ToggleFavoriteData) => {
			if (isFavorite) {
				await documentsClientRequests.removeFavorite(documentId, searchSpaceId);
			} else {
				await documentsClientRequests.addFavorite(documentId, searchSpaceId);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
			queryClient.invalidateQueries({ queryKey: [SEARCH_DOCUMENTS] });
		},
		...options,
	});
};

export default useToggleFavorite;
