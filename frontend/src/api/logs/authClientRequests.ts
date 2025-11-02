import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createLog,
	deleteLog,
	getLog,
	getLogs,
	getLogsSummary,
	updateLog,
} from "./requests";

const logsClientRequests = {
	getLogs: withAuthenticatedClientRequest(getLogs),
	getLog: withAuthenticatedClientRequest(getLog),
	createLog: withAuthenticatedClientRequest(createLog),
	updateLog: withAuthenticatedClientRequest(updateLog),
	deleteLog: withAuthenticatedClientRequest(deleteLog),
	getLogsSummary: withAuthenticatedClientRequest(getLogsSummary),
};

export default logsClientRequests;
