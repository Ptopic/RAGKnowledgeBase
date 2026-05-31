export interface SubscriptionInfo {
	plan: string;
	status: string;
	credits_used: number;
	monthly_credit_limit: number;
	current_period_start: string;
	current_period_end: string;
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
