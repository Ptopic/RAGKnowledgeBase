"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import documentsClientRequests from "@/api/documents/authClientRequests";
import useDeleteDocument from "@/api/documents/hooks/useDeleteDocument";
import useToggleFavorite from "@/api/documents/hooks/useToggleFavorite";
import type {
	Document,
	DocumentType,
	GetDocumentsParams,
	SearchDocumentsParams,
} from "@/api/documents/types";

// Re-export types for backward compatibility
export type { Document, DocumentType };

export interface UseDocumentsOptions {
	page?: number;
	pageSize?: number;
	lazy?: boolean;
	documentTypes?: string[];
}

export function useDocuments(
	searchSpaceId: number,
	options?: UseDocumentsOptions | boolean,
) {
	// Support both old boolean API and new options API for backward compatibility
	const opts = typeof options === "boolean" ? { lazy: options } : options || {};
	const { page, pageSize = 50, lazy = false, documentTypes } = opts;

	const queryClient = useQueryClient();
	const [documents, setDocuments] = useState<Document[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(!lazy);
	const [error, setError] = useState<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

	// The full-screen "Loading..." spinner should only appear on the very
	// first fetch (when there is no data on screen yet). Every subsequent
	// refetch — filter changes, bulk-delete refresh, and most importantly
	// the SSE-driven `documents` event from a connector indexer — must run
	// silently so the table updates in place. The logs page already behaves
	// this way (it reads from React Query, where `isLoading` is false
	// during background refetches); we match that UX here.
	const hasLoadedOnceRef = useRef(false);

	const { mutate: deleteDocumentMutation } = useDeleteDocument({
		onSuccess: (_, params) => {
			setDocuments((prev) => prev.filter((doc) => doc.id !== params.id));
			setFavoriteIds((prev) => {
				const next = new Set(prev);
				next.delete(params.id);
				return next;
			});
		},
	});

	const { mutate: toggleFavoriteMutation } = useToggleFavorite();

	const fetchDocuments = useCallback(
		async (
			fetchPage?: number,
			fetchPageSize?: number,
			fetchDocumentTypes?: string[],
			fetchFavoriteStatus?: "all" | "favorited" | "non_favorited",
		) => {
			if (isLoaded && lazy) return; // Avoid redundant calls in lazy mode

			try {
				if (!hasLoadedOnceRef.current) setLoading(true);
				setError(null);

				const favoriteStatusParam =
					fetchFavoriteStatus && fetchFavoriteStatus !== "all"
						? fetchFavoriteStatus
						: undefined;

				const params: GetDocumentsParams = {
					search_space_id: searchSpaceId,
					page: fetchPage !== undefined ? fetchPage : page,
					page_size: fetchPageSize !== undefined ? fetchPageSize : pageSize,
					document_types:
						fetchDocumentTypes !== undefined
							? fetchDocumentTypes
							: documentTypes,
					favorite_status: favoriteStatusParam,
				};

				const result = await queryClient.fetchQuery({
					queryKey: [
						"documents",
						params.search_space_id,
						params.page,
						params.page_size,
						params.document_types,
						params.favorite_status,
					],
					queryFn: () => documentsClientRequests.getDocuments(params),
				});

				setDocuments(result.items);
				setTotal(result.total);
				if (result.favorite_ids) {
					setFavoriteIds(new Set(result.favorite_ids));
				}
				setIsLoaded(true);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch documents";
				setError(errorMessage);
				console.error("Error fetching documents:", err);
				toast.error("Failed to fetch documents");
			} finally {
				if (!hasLoadedOnceRef.current) {
					hasLoadedOnceRef.current = true;
					setLoading(false);
				}
			}
		},
		[searchSpaceId, page, pageSize, documentTypes, isLoaded, lazy, queryClient],
	);

	useEffect(() => {
		if (!lazy && searchSpaceId) {
			fetchDocuments();
		}
	}, [searchSpaceId, lazy, fetchDocuments]);

	// Function to refresh the documents list
	const refreshDocuments = useCallback(async () => {
		setIsLoaded(false); // Reset memoization flag to allow refetch
		await queryClient.invalidateQueries({
			queryKey: ["documents", searchSpaceId],
		});
		await fetchDocuments();
	}, [fetchDocuments, queryClient, searchSpaceId]);

	// Function to search documents by title
	const searchDocuments = useCallback(
		async (
			searchQuery: string,
			fetchPage?: number,
			fetchPageSize?: number,
			fetchDocumentTypes?: string[],
			fetchFavoriteStatus?: "all" | "favorited" | "non_favorited",
		) => {
			if (!searchQuery.trim()) {
				// If search is empty, fetch all documents
				return fetchDocuments(
					fetchPage,
					fetchPageSize,
					fetchDocumentTypes,
					fetchFavoriteStatus,
				);
			}

			try {
				if (!hasLoadedOnceRef.current) setLoading(true);
				setError(null);

				const favoriteStatusParam =
					fetchFavoriteStatus && fetchFavoriteStatus !== "all"
						? fetchFavoriteStatus
						: undefined;

				const params: SearchDocumentsParams = {
					search_space_id: searchSpaceId,
					title: searchQuery,
					page: fetchPage !== undefined ? fetchPage : page,
					page_size: fetchPageSize !== undefined ? fetchPageSize : pageSize,
					document_types:
						fetchDocumentTypes !== undefined
							? fetchDocumentTypes
							: documentTypes,
					favorite_status: favoriteStatusParam,
				};

				const result = await queryClient.fetchQuery({
					queryKey: [
						"searchDocuments",
						params.search_space_id,
						params.title,
						params.page,
						params.page_size,
						params.document_types,
						params.favorite_status,
					],
					queryFn: () => documentsClientRequests.searchDocuments(params),
				});

				setDocuments(result.items);
				setTotal(result.total);
				if (result.favorite_ids) {
					setFavoriteIds(new Set(result.favorite_ids));
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to search documents";
				setError(errorMessage);
				console.error("Error searching documents:", err);
				toast.error("Failed to search documents");
			} finally {
				if (!hasLoadedOnceRef.current) {
					hasLoadedOnceRef.current = true;
					setLoading(false);
				}
			}
		},
		[searchSpaceId, page, pageSize, documentTypes, fetchDocuments, queryClient],
	);

	// Function to delete a document
	const deleteDocument = useCallback(
		async (documentId: number) => {
			await deleteDocumentMutation({ id: documentId, searchSpaceId });
		},
		[deleteDocumentMutation, searchSpaceId],
	);

	// Function to get document type counts
	const getDocumentTypeCounts = useCallback(async () => {
		try {
			const result = await queryClient.fetchQuery({
				queryKey: ["documentTypeCounts", searchSpaceId],
				queryFn: () =>
					documentsClientRequests.getDocumentTypeCounts({
						search_space_id: searchSpaceId,
					}),
			});
			return result.reduce(
				(acc, item) => {
					acc[item.type] = item.count;
					return acc;
				},
				{} as Record<string, number>,
			);
		} catch (err) {
			console.error("Error fetching document type counts:", err);
			return {};
		}
	}, [searchSpaceId, queryClient]);

	const toggleFavorite = useCallback(
		async (documentId: number, currentIsFavorite: boolean) => {
			const prevFavoriteIds = new Set(favoriteIds);
			toggleFavoriteMutation(
				{ documentId, searchSpaceId, isFavorite: currentIsFavorite },
				{
					onSuccess: () => {
						setFavoriteIds((prev) => {
							const next = new Set(prev);
							if (currentIsFavorite) {
								next.delete(documentId);
							} else {
								next.add(documentId);
							}
							return next;
						});
					},
					onError: () => {
						setFavoriteIds(prevFavoriteIds);
						toast.error(
							currentIsFavorite
								? "Failed to remove from favorites"
								: "Failed to add to favorites",
						);
					},
				},
			);
		},
		[toggleFavoriteMutation, favoriteIds],
	);

	return {
		documents,
		total,
		loading,
		error,
		isLoaded,
		favoriteIds,
		fetchDocuments,
		searchDocuments,
		refreshDocuments,
		deleteDocument,
		toggleFavorite,
		getDocumentTypeCounts,
	};
}
