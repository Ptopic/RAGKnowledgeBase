import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import documentsClientRequests from "@/api/documents/authClientRequests";
import useGetDocumentTypeCounts from "@/api/documents/hooks/useGetDocumentTypeCounts";
import type { DocumentTypeCount } from "@/api/documents/types";

// Re-export type for backward compatibility
export type { DocumentTypeCount };

/**
 * Hook to fetch document type counts from the API
 * @param searchSpaceId - The search space ID to filter document types
 * @param lazy - If true, types won't be fetched on mount
 */
export const useDocumentTypes = (
	searchSpaceId?: number,
	lazy: boolean = false,
) => {
	const queryClient = useQueryClient();

	const {
		data: documentTypes = [],
		isLoading,
		error: queryError,
	} = useGetDocumentTypeCounts(
		searchSpaceId !== undefined
			? { search_space_id: searchSpaceId }
			: undefined,
		{
			enabled: !lazy,
		},
	);

	const isLoaded =
		(Array.isArray(documentTypes) && documentTypes.length > 0) || !isLoading;
	const error = queryError || null;

	const fetchDocumentTypes = useCallback(
		async (spaceId?: number) => {
			const params =
				spaceId !== undefined ? { search_space_id: spaceId } : undefined;
			const result = await queryClient.fetchQuery({
				queryKey: ["documentTypeCounts", params?.search_space_id],
				queryFn: () => documentsClientRequests.getDocumentTypeCounts(params),
			});
			return result;
		},
		[queryClient],
	);

	const refreshDocumentTypes = useCallback(
		async (spaceId?: number) => {
			const params =
				spaceId !== undefined
					? { search_space_id: spaceId }
					: searchSpaceId !== undefined
						? { search_space_id: searchSpaceId }
						: undefined;
			await queryClient.invalidateQueries({
				queryKey: ["documentTypeCounts", params?.search_space_id],
			});
		},
		[queryClient, searchSpaceId],
	);

	return {
		documentTypes,
		isLoading,
		isLoaded,
		error,
		fetchDocumentTypes,
		refreshDocumentTypes,
	};
};
