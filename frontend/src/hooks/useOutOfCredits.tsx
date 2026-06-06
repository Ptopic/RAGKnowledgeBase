import useGetCurrentUser from "@/api/users/hooks/useGetCurrentUser";
import useGetSubscription from "@/api/subscription/hooks/useGetSubscription";

/**
 * Decide whether the current user is "out of credits" and therefore
 * should be blocked from paid features. Combines the user's role
 * (admins bypass) and their subscription state (Free vs paid, used
 * vs limit).
 *
 * Returns:
 * - `isLoading`     — true while the user or subscription query is in flight.
 * - `isOutOfCredits` — true when the user has no credits left AND is
 *   not an admin. UI should render the OutOfCreditsPage when true.
 * - `isSuperuser`   — the admin flag, exposed so the gate can show a
 *   "you're not charged" tooltip if needed.
 */
const useOutOfCredits = () => {
	const { data: currentUser, isLoading: isLoadingUser } = useGetCurrentUser();
	const { data: subscription, isLoading: isLoadingSub } = useGetSubscription();

	const isSuperuser = currentUser?.isSuperuser ?? false;
	const isLoading = isLoadingUser || isLoadingSub;

	// `monthly_credit_limit` defaults to 1000 in the backend when the
	// user is on a tier with no DB row, so the strict equality is
	// safe: any tier with a real limit returns a positive number.
	const creditsUsed = subscription?.credits_used ?? 0;
	const monthlyLimit = subscription?.monthly_credit_limit ?? 0;
	const isOutOfCredits = !isSuperuser && monthlyLimit > 0 && creditsUsed >= monthlyLimit;

	return { isLoading, isOutOfCredits, isSuperuser };
};

export default useOutOfCredits;
