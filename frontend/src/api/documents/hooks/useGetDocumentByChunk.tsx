import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { DOCUMENT_BY_CHUNKS } from "@/shared/queryKeys";
import documentsClientRequests from "../authClientRequests";
import type { DocumentWithChunks } from "../types";

const useGetDocumentByChunk = (
	chunkId: number | null | undefined,
	options?: UseQueryOptions<DocumentWithChunks, Error>,
) => {
	return useQuery<DocumentWithChunks, Error>({
		queryKey: [DOCUMENT_BY_CHUNKS, chunkId],
		queryFn: () => {
			if (!chunkId) {
				throw new Error("Chunk ID is required");
			}
			return documentsClientRequests.getDocumentByChunk(chunkId);
		},
		enabled: !!chunkId,
		...options,
	});
};

export default useGetDocumentByChunk;
