import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	cancelSubscription,
	createCheckoutSession,
	createPortalSession,
	getAdminSubscriptions,
	getPlans,
	getPreferences,
	getSubscription,
	adminOverridePlan,
	adminResetCredits,
	resumeSubscription,
	updatePreferences,
} from "./requests";

const subscriptionClientRequests = {
	getPlans: withAuthenticatedClientRequest(getPlans),
	getSubscription: withAuthenticatedClientRequest(getSubscription),
	getPreferences: withAuthenticatedClientRequest(getPreferences),
	updatePreferences: withAuthenticatedClientRequest(updatePreferences),
	createCheckoutSession: withAuthenticatedClientRequest(createCheckoutSession),
	createPortalSession: withAuthenticatedClientRequest(createPortalSession),
	resumeSubscription: withAuthenticatedClientRequest(resumeSubscription),
	cancelSubscription: withAuthenticatedClientRequest(cancelSubscription),
	getAdminSubscriptions: withAuthenticatedClientRequest(getAdminSubscriptions),
	adminOverridePlan: withAuthenticatedClientRequest(adminOverridePlan),
	adminResetCredits: withAuthenticatedClientRequest(adminResetCredits),
};

export default subscriptionClientRequests;
