"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import documentsClientRequests from "@/api/documents/authClientRequests";
import useGetDocumentByChunk from "@/api/documents/hooks/useGetDocumentByChunk";
import type {
	Chunk,
	DocumentType,
	DocumentWithChunks,
} from "@/api/documents/types";

// Re-export types for backward compatibility
export type { Chunk, DocumentType, DocumentWithChunks };

export function useDocumentByChunk() {
	const queryClient = useQueryClient();
	const [chunkId, setChunkId] = useState<number | null>(null);

	const {
		data: document,
		isLoading: loading,
		error: queryError,
	} = useGetDocumentByChunk(chunkId);

	const error = queryError?.message || null;

	// Handle errors with toast notifications (query hooks don't support onError)
	useEffect(() => {
		if (queryError) {
			console.error("Error fetching document by chunk:", queryError);
			const errorMessage =
				queryError.message?.includes("404") ||
				queryError.message?.includes("not found")
					? "Chunk not found or you don't have access to it"
					: queryError.message || "Failed to fetch document";
			toast.error(errorMessage);
		}
	}, [queryError]);

	const fetchDocumentByChunk = useCallback(
		async (id: number) => {
			setChunkId(id);
			// Refetch the query
			const result = await queryClient.fetchQuery({
				queryKey: ["documentByChunk", id],
				queryFn: () => documentsClientRequests.getDocumentByChunk(id),
			});
			return result;
		},
		[queryClient],
	);

	const clearDocument = useCallback(() => {
		setChunkId(null);
		queryClient.removeQueries({ queryKey: ["documentByChunk"] });
	}, [queryClient]);

	return {
		document: document || null,
		loading,
		error,
		fetchDocumentByChunk,
		clearDocument,
	};
}
