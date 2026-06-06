export interface SubscriptionInfo {
	plan: string;
	status: string;
	credits_used: number;
	monthly_credit_limit: number;
	current_period_start: string;
	current_period_end: string;
	cancel_at: string | null;
}

export interface PlanInfo {
	plan: string;
	name: string;
	description: string | null;
	credits: number;
	price_id: string;
	amount: number;
	currency: string;
	interval: string;
}

export interface PreferencesInfo {
	preferred_language: string;
}

export interface CheckoutSessionResponse {
	url: string;
}

export interface PortalSessionResponse {
	url: string;
}

export interface ResumeSubscriptionResponse {
	message: string;
}

export interface CancelSubscriptionResponse {
	message: string;
	cancel_at: string;
}

export interface AdminSubscriptionUser {
	id: string;
	email: string;
	full_name: string | null;
	plan: string;
	status: string;
	credits_used: number;
	monthly_credit_limit: number;
	stripe_customer_id: string | null;
}

export interface AdminSubscriptionList {
	users: AdminSubscriptionUser[];
	total: number;
	active_subscriptions: number;
	total_revenue: string;
	free_tier_count: number;
}

export interface OverridePlanResponse {
	message: string;
}

export interface ResetCreditsResponse {
	message: string;
}

export type AdminPlanName = "FREE" | "PRO" | "BUSINESS";

export interface AdminPlanDefinition {
	plan: AdminPlanName;
	monthly_credit_limit: number;
	created_at: string;
	updated_at: string;
	updated_by_user_id: string | null;
}
export interface AdminPlanDefinitionList {
	plans: AdminPlanDefinition[];
}

export interface PlanCreditLimit {
	plan: string;
	monthly_credit_limit: number;
}

export interface PlanCreditLimitsResponse {
	plans: PlanCreditLimit[];
}

export interface UpdatePlanCreditsPayload {
	plan: AdminPlanName;
	monthlyCreditLimit: number;
}

export type UpdatePlanCreditsResponse = AdminPlanDefinition;
