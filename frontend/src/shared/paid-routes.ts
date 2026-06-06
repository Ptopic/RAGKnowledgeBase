/**
 * Path patterns for "paid features" — pages the user cannot visit when
 * they are out of credits. Mirrors the backend `@RequiresCredits()`
 * guard set on the agent, documents, notebooks, and
 * search-source-connectors controllers. When you add a new paid
 * endpoint there, add its frontend page to this list.
 */
export const PAID_ROUTE_PATTERNS: ReadonlyArray<RegExp> = [
	// Document ingestion (file upload, YouTube transcript, URL crawl).
	/^\/dashboard\/[^/]+\/documents\/upload(?:\/|$)/,
	/^\/dashboard\/[^/]+\/documents\/youtube(?:\/|$)/,
	/^\/dashboard\/[^/]+\/documents\/webpage(?:\/|$)/,

	// Notebook creation + edit (the edit path re-runs indexing).
	/^\/dashboard\/[^/]+\/notebooks\/create(?:\/|$)/,
	/^\/dashboard\/[^/]+\/notebooks\/[^/]+\/edit(?:\/|$)/,

	// Researcher agent / chat (LLM-backed; consumes credits per turn).
	/^\/dashboard\/[^/]+\/researcher(?:\/|$)/,

	// Connector creation + indexing (kicks off AI-powered indexers).
	/^\/dashboard\/[^/]+\/connectors\/add(?:\/|$)/,
	/^\/dashboard\/[^/]+\/connectors\/[^/]+\/edit(?:\/|$)/,
];

/**
 * Check whether a given pathname is a "paid" route. Used by the
 * route-level credit gate component.
 */
export const isPaidRoute = (pathname: string): boolean =>
	PAID_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
