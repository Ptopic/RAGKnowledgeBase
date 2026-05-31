import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	adminOverridePlan,
	adminResetCredits,
	createCheckoutSession,
	createPortalSession,
	getAdminSubscriptions,
	getPreferences,
	getSubscription,
	updatePreferences,
} from "./requests";

const subscriptionClientRequests = {
	getSubscription: withAuthenticatedClientRequest(getSubscription),
	getPreferences: withAuthenticatedClientRequest(getPreferences),
	updatePreferences: withAuthenticatedClientRequest(updatePreferences),
	createCheckoutSession: withAuthenticatedClientRequest(createCheckoutSession),
	createPortalSession: withAuthenticatedClientRequest(createPortalSession),
	getAdminSubscriptions: withAuthenticatedClientRequest(getAdminSubscriptions),
	adminOverridePlan: withAuthenticatedClientRequest(adminOverridePlan),
	adminResetCredits: withAuthenticatedClientRequest(adminResetCredits),
};

export default subscriptionClientRequests;
