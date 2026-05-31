import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createAdminUser,
	deleteAdminUser,
	getAdminMetrics,
	getAdminUsers,
	toggleAdminUserActive,
	updateAdminUser,
} from "./requests";

const adminClientRequests = {
	getAdminUsers: withAuthenticatedClientRequest(getAdminUsers),
	createAdminUser: withAuthenticatedClientRequest(createAdminUser),
	updateAdminUser: withAuthenticatedClientRequest(updateAdminUser),
	deleteAdminUser: withAuthenticatedClientRequest(deleteAdminUser),
	toggleAdminUserActive: withAuthenticatedClientRequest(toggleAdminUserActive),
	getAdminMetrics: withAuthenticatedClientRequest(getAdminMetrics),
};

export default adminClientRequests;
