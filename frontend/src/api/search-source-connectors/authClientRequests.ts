import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createSearchSourceConnector,
	deleteSearchSourceConnector,
	getSearchSourceConnectors,
	indexConnector,
	updateSearchSourceConnector,
} from "./requests";

const searchSourceConnectorsClientRequests = {
	getSearchSourceConnectors: withAuthenticatedClientRequest(
		getSearchSourceConnectors
	),
	createSearchSourceConnector: withAuthenticatedClientRequest(
		createSearchSourceConnector
	),
	updateSearchSourceConnector: withAuthenticatedClientRequest(
		updateSearchSourceConnector
	),
	deleteSearchSourceConnector: withAuthenticatedClientRequest(
		deleteSearchSourceConnector
	),
	indexConnector: withAuthenticatedClientRequest(indexConnector),
};

export default searchSourceConnectorsClientRequests;
