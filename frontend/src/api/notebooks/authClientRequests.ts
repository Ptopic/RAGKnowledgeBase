import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createNotebook,
	deleteNotebook,
	getNotebook,
	getNotebooks,
	updateNotebook,
} from "./requests";

const notebooksClientRequests = {
	getNotebooks: withAuthenticatedClientRequest(getNotebooks),
	getNotebook: withAuthenticatedClientRequest(getNotebook),
	createNotebook: withAuthenticatedClientRequest(createNotebook),
	updateNotebook: withAuthenticatedClientRequest(updateNotebook),
	deleteNotebook: withAuthenticatedClientRequest(deleteNotebook),
};

export default notebooksClientRequests;
