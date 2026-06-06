import { SetMetadata } from "@nestjs/common";

export const REQUIRES_CREDITS_KEY = "requiresCredits";

/**
 * Mark a controller route as a "paid feature" that consumes user
 * credits. The `CreditsRequiredGuard` reads this metadata and rejects
 * the request with 402 Payment Required when the caller is out of
 * credits (or 400 if no @RequiresCredits() metadata is set — fail
 * closed rather than fail open).
 *
 * `estimatedCredits` lets the route reserve a specific cost (e.g.
 * `1` for a chat turn, the number of items for a bulk upload). It
 * defaults to 1, which matches the simple "1 credit per action"
 * heuristic used by chat turns, connector kickoffs, etc.
 *
 * Usage:
 *   @Post('chat')
 *   @UseGuards(JwtAuthGuard, CreditsRequiredGuard)
 *   @RequiresCredits(1)
 *   async handleChat(...) { ... }
 */
export const RequiresCredits = (estimatedCredits: number = 1) =>
	SetMetadata(REQUIRES_CREDITS_KEY, estimatedCredits);
