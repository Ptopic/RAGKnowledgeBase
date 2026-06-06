import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import {
	REQUIRES_CREDITS_KEY,
} from "../decorators/requires-credits.decorator";

/**
 * Structural slice of `SubscriptionService` the guard relies on. Kept
 * narrow on purpose so the guard can be typechecked and unit-tested
 * without pulling in the rest of the service (which transitively
 * imports Stripe types that are noisy in the test environment).
 */
export interface CreditsGuardSubscriptionService {
	isSuperuserBypass(userId: string): Promise<boolean>;
	checkCredits(userId: string, estimatedCredits: number): Promise<boolean>;
}

/**
 * Backend gate for "paid features" — endpoints that consume user
 * credits (LLM calls, embedding work, premium parse APIs, etc.).
 *
 * Behavior:
 * - If a route has no @RequiresCredits() metadata, the guard passes
 *   through (it can be applied globally to opt in via the decorator).
 * - If the caller is a superuser, the check is skipped — admins are
 *   never charged credits, matching the existing isSuperuserBypass
 *   policy in the credit-deduction code.
 * - Otherwise, delegates to SubscriptionService.checkCredits() which
 *   throws a `CreditsExceededError` (HTTP 400) if the user has no
 *   credits left. Frontend maps that to the "Out of credits" page.
 *
 * Apply alongside JwtAuthGuard so `req.user.id` is populated:
 *
 *   @UseGuards(JwtAuthGuard, CreditsRequiredGuard)
 *   @RequiresCredits(1)
 *   async paidEndpoint() { ... }
 */
@Injectable()
export class CreditsRequiredGuard implements CanActivate {
	private readonly logger = new Logger(CreditsRequiredGuard.name);

	constructor(
		private readonly reflector: Reflector,
		private readonly subscriptionService: CreditsGuardSubscriptionService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const estimatedCredits = this.reflector.getAllAndOverride<number>(
			REQUIRES_CREDITS_KEY,
			[context.getHandler(), context.getClass()],
		);

		// No @RequiresCredits() on this route — guard is a no-op.
		if (estimatedCredits === undefined || estimatedCredits === null) {
			return true;
		}

		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: { id?: string; isSuperuser?: boolean } }>();

		const userId = request.user?.id;
		if (!userId) {
			// JwtAuthGuard must run before this; if it didn't, fail
			// closed rather than letting a paid action through.
			return false;
		}

		// Admins are not charged credits — mirrors isSuperuserBypass().
		if (await this.subscriptionService.isSuperuserBypass(userId)) {
			return true;
		}

		await this.subscriptionService.checkCredits(userId, estimatedCredits);
		return true;
	}
}
