import { withAuthenticatedClientRequest, withClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createNotebook,
	deleteNotebook,
	deleteNotebookImage,
	getNotebook,
	getNotebooks,
	getPublicNotebookBySlug,
	getPublicNotebooks,
	publishNotebook,
	unpublishNotebook,
	updateNotebook,
	uploadNotebookImage,
} from "./requests";

const notebooksClientRequests = {
	getNotebooks: withAuthenticatedClientRequest(getNotebooks),
	getNotebook: withAuthenticatedClientRequest(getNotebook),
	createNotebook: withAuthenticatedClientRequest(createNotebook),
	updateNotebook: withAuthenticatedClientRequest(updateNotebook),
	deleteNotebook: withAuthenticatedClientRequest(deleteNotebook),
	uploadNotebookImage: withAuthenticatedClientRequest(uploadNotebookImage),
	deleteNotebookImage: withAuthenticatedClientRequest(deleteNotebookImage),
	publishNotebook: withAuthenticatedClientRequest(publishNotebook),
	unpublishNotebook: withAuthenticatedClientRequest(unpublishNotebook),
	getPublicNotebooks: withClientRequest(getPublicNotebooks),
	getPublicNotebookBySlug: withClientRequest(getPublicNotebookBySlug),
};

export default notebooksClientRequests;
