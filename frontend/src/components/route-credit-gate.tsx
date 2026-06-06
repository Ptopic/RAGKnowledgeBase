"use client";

import type { ReactNode } from "react";
import useOutOfCredits from "@/hooks/useOutOfCredits";
import OutOfCreditsPage from "@/components/out-of-credits-page";

interface RouteCreditGateProps {
	children: ReactNode;
}

/**
 * Client-side route gate for "paid features". Renders the children
 * when the user has credits (or is an admin) and replaces the page
 * with the OutOfCreditsPage when they don't.
 *
 * The backend `@RequiresCredits()` guard (CreditsRequiredGuard) is
 * the source of truth — this gate is the user-facing counterpart
 * that gives a clear page-level signal instead of letting the user
 * click a button and then see an error toast. Both layers use the
 * same threshold (creditsUsed >= monthlyCreditLimit), so they will
 * always agree.
 *
 * Apply at the page level on every paid route. Read-only routes
 * (browsing documents, reading existing notebooks, settings, etc.)
 * should NOT be wrapped — users can still read their content while
 * out of credits, just not create new paid work.
 */
export function RouteCreditGate({ children }: RouteCreditGateProps) {
	const { isLoading, isOutOfCredits } = useOutOfCredits();

	// Render a minimal skeleton while queries load. The whole dashboard
	// already has its own per-route loading state, but we want to avoid
	// a flash of paid UI for users who are out of credits.
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="text-sm text-muted-foreground">Loading…</div>
			</div>
		);
	}

	if (isOutOfCredits) {
		return <OutOfCreditsPage />;
	}

	return <>{children}</>;
}

export default RouteCreditGate;
