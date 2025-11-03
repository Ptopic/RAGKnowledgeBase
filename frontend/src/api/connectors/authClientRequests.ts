import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createConnector,
	deleteConnector,
	getConnector,
	getConnectors,
	initiateGoogleCalendarOAuth,
	initiateGoogleGmailOAuth,
	updateConnector,
} from "./requests";

const connectorsClientRequests = {
	initiateGoogleCalendarOAuth: withAuthenticatedClientRequest(
		initiateGoogleCalendarOAuth,
	),
	initiateGoogleGmailOAuth: withAuthenticatedClientRequest(
		initiateGoogleGmailOAuth,
	),
	createConnector: withAuthenticatedClientRequest(createConnector),
	getConnectors: withAuthenticatedClientRequest(getConnectors),
	getConnector: withAuthenticatedClientRequest(getConnector),
	updateConnector: withAuthenticatedClientRequest(updateConnector),
	deleteConnector: withAuthenticatedClientRequest(deleteConnector),
};

export default connectorsClientRequests;
