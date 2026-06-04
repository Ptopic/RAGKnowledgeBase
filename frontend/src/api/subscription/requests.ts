import type { ICallableRequestBuilder } from "@api/requestBuilder/types";
import config from "@shared/config";
import type {
	AdminPlanDefinitionList,
	AdminPlanName,
	AdminSubscriptionList,
	CancelSubscriptionResponse,
	CheckoutSessionResponse,
	OverridePlanResponse,
	PlanInfo,
	PortalSessionResponse,
	PreferencesInfo,
	ResetCreditsResponse,
	ResumeSubscriptionResponse,
	SubscriptionInfo,
	UpdatePlanCreditsResponse,
} from "./types";

export const getPlans =
	(request: ICallableRequestBuilder<PlanInfo[]>) =>
	async (): Promise<PlanInfo[]> =>
		request.call(`${config.apiUrl}/subscription/plans`, (init) => ({
			...init,
			method: "GET",
		}));

export const getSubscription =
	(request: ICallableRequestBuilder<SubscriptionInfo>) =>
	async (): Promise<SubscriptionInfo> =>
		request.call(`${config.apiUrl}/subscription`, (init) => ({
			...init,
			method: "GET",
		}));

export const getPreferences =
	(request: ICallableRequestBuilder<PreferencesInfo>) =>
	async (): Promise<PreferencesInfo> =>
		request.call(`${config.apiUrl}/auth/preferences`, (init) => ({
			...init,
			method: "GET",
		}));

export const updatePreferences =
	(request: ICallableRequestBuilder<PreferencesInfo>) =>
	async (body: { preferred_language: string }): Promise<PreferencesInfo> =>
		request.call(`${config.apiUrl}/auth/preferences`, (init) => ({
			...init,
			method: "PATCH",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		}));

export const createCheckoutSession =
	(request: ICallableRequestBuilder<CheckoutSessionResponse>) =>
	async (body: { plan: string }): Promise<CheckoutSessionResponse> =>
		request.call(`${config.apiUrl}/subscription/checkout`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		}));

export const createPortalSession =
	(request: ICallableRequestBuilder<PortalSessionResponse>) =>
	async (): Promise<PortalSessionResponse> =>
		request.call(`${config.apiUrl}/subscription/portal`, (init) => ({
			...init,
			method: "POST",
		}));

export const getAdminSubscriptions =
	(request: ICallableRequestBuilder<AdminSubscriptionList>) =>
	async (params: {
		skip?: number;
		limit?: number;
		search?: string;
	}): Promise<AdminSubscriptionList> => {
		const searchParams = new URLSearchParams();
		if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
		if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
		if (params.search) searchParams.set("search", params.search);
		const qs = searchParams.toString();
		const url = `${config.apiUrl}/admin/subscriptions${qs ? `?${qs}` : ""}`;
		return request.call(url, (init) => ({
			...init,
			method: "GET",
		}));
	};

export const adminOverridePlan =
	(request: ICallableRequestBuilder<OverridePlanResponse>) =>
	async ({ userId, plan }: { userId: string; plan: string }): Promise<OverridePlanResponse> =>
		request.call(`${config.apiUrl}/admin/subscriptions/${userId}/plan`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ plan }),
		}));

export const adminResetCredits =
	(request: ICallableRequestBuilder<ResetCreditsResponse>) =>
	async ({ userId }: { userId: string }): Promise<ResetCreditsResponse> =>
		request.call(`${config.apiUrl}/admin/subscriptions/${userId}/reset-credits`, (init) => ({
			...init,
			method: "POST",
		}));

export const getAdminPlans =
	(request: ICallableRequestBuilder<AdminPlanDefinitionList>) =>
	async (): Promise<AdminPlanDefinitionList> =>
		request.call(`${config.apiUrl}/admin/subscription-plans`, (init) => ({
			...init,
			method: "GET",
		}));

export const adminUpdatePlanCredits =
	(request: ICallableRequestBuilder<UpdatePlanCreditsResponse>) =>
	async ({
		plan,
		monthlyCreditLimit,
	}: {
		plan: AdminPlanName;
		monthlyCreditLimit: number;
	}): Promise<UpdatePlanCreditsResponse> =>
		request.call(`${config.apiUrl}/admin/subscription-plans/${plan}/credits`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ monthlyCreditLimit }),
		}));

export const resumeSubscription =
	(request: ICallableRequestBuilder<ResumeSubscriptionResponse>) =>
	async (): Promise<ResumeSubscriptionResponse> =>
		request.call(`${config.apiUrl}/subscription/resume`, (init) => ({
			...init,
			method: "POST",
		}));

export const cancelSubscription =
	(request: ICallableRequestBuilder<CancelSubscriptionResponse>) =>
	async (): Promise<CancelSubscriptionResponse> =>
		request.call(`${config.apiUrl}/subscription/cancel`, (init) => ({
			...init,
			method: "POST",
		}));
