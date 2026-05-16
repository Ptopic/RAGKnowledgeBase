import { withAuthenticatedClientRequest, withClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createShareLink,
	deactivateAllShareLinks,
	deactivateShareLink,
	getChatShareLinks,
	getSharedChat,
} from "./requests";

const shareClientRequests = {
	createShareLink: withAuthenticatedClientRequest(createShareLink),
	getChatShareLinks: withAuthenticatedClientRequest(getChatShareLinks),
	deactivateAllShareLinks: withAuthenticatedClientRequest(deactivateAllShareLinks),
	deactivateShareLink: withAuthenticatedClientRequest(deactivateShareLink),
	getSharedChat: withClientRequest(getSharedChat),
};

export default shareClientRequests;
