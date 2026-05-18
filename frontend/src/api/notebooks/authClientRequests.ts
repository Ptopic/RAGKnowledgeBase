import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createNotebook,
	deleteNotebook,
	deleteNotebookImage,
	getNotebook,
	getNotebooks,
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
};

export default notebooksClientRequests;
