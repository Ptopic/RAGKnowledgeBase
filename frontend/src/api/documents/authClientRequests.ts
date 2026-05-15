import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	addFavorite,
	addYouTubeVideos,
	crawlWebpages,
	deleteDocument,
	getDocumentByChunk,
	getDocumentTypeCounts,
	getDocumentWithChunks,
	getDocuments,
	removeFavorite,
	searchDocuments,
	uploadDocuments,
} from "./requests";
import type { DocumentTypeCount, GetDocumentTypeCountsParams } from "./types";

// Wrapper for getDocumentTypeCounts to handle type conversion
// The API returns Record<string, number> but we need DocumentTypeCount[]
const getDocumentTypeCountsWrapper = async (
	params?: GetDocumentTypeCountsParams,
): Promise<DocumentTypeCount[]> => {
	const rawRequest = withAuthenticatedClientRequest(getDocumentTypeCounts);
	const data = await rawRequest(params);
	// Convert the object to an array of DocumentTypeCount
	return Object.entries(data).map(([type, count]) => ({
		type,
		count: count as number,
	}));
};

const documentsClientRequests = {
	uploadDocuments: withAuthenticatedClientRequest(uploadDocuments),
	crawlWebpages: withAuthenticatedClientRequest(crawlWebpages),
	addYouTubeVideos: withAuthenticatedClientRequest(addYouTubeVideos),
	getDocumentByChunk: withAuthenticatedClientRequest(getDocumentByChunk),
	getDocumentWithChunks: withAuthenticatedClientRequest(getDocumentWithChunks),
	getDocumentTypeCounts: getDocumentTypeCountsWrapper,
	getDocuments: withAuthenticatedClientRequest(getDocuments),
	searchDocuments: withAuthenticatedClientRequest(searchDocuments),
	deleteDocument: withAuthenticatedClientRequest(deleteDocument),
	addFavorite: withAuthenticatedClientRequest(addFavorite),
	removeFavorite: withAuthenticatedClientRequest(removeFavorite),
};

export default documentsClientRequests;
