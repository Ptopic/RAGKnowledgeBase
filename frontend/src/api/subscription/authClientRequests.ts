import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	adminOverridePlan,
	adminResetCredits,
	adminUpdatePlanCredits,
	cancelSubscription,
	createCheckoutSession,
	createPortalSession,
	getAdminPlans,
	getAdminSubscriptions,
	getPlans,
	getPlanCreditLimits,
	getPreferences,
	getSubscription,
	resumeSubscription,
	updatePreferences,
} from "./requests";

const subscriptionClientRequests = {
	getPlans: withAuthenticatedClientRequest(getPlans),
	getPlanCreditLimits: withAuthenticatedClientRequest(getPlanCreditLimits),
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
	getAdminPlans: withAuthenticatedClientRequest(getAdminPlans),
	adminUpdatePlanCredits: withAuthenticatedClientRequest(adminUpdatePlanCredits),
};

export default subscriptionClientRequests;
