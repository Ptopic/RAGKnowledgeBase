import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createApiKey,
	deleteApiKey,
	getApiKeys,
	updateApiKey,
} from "./requests";

const apiKeysClientRequests = {
	getApiKeys: withAuthenticatedClientRequest(getApiKeys),
	createApiKey: withAuthenticatedClientRequest(createApiKey),
	updateApiKey: withAuthenticatedClientRequest(updateApiKey),
	deleteApiKey: withAuthenticatedClientRequest(deleteApiKey),
};

export default apiKeysClientRequests;
