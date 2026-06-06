export function formatCredits(credits: number): string {
	return credits.toLocaleString();
}

/**
 * Format a Stripe `unit_amount` (smallest currency unit, e.g. cents)
 * as a localized currency string. USD only for now — Stripe prices
 * for the paid tiers are configured in USD.
 */
export function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: 0,
	}).format(amount / 100);
}
