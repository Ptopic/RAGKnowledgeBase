const SAFE_REDIRECT_ROUTES = ["/invite", "/dashboard"];

export function isSafeRedirect(url: string): boolean {
	return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

export function resolveRedirectPath(searchParams: URLSearchParams): string {
	const redirect = searchParams.get("redirect");
	if (redirect && isSafeRedirect(redirect) && SAFE_REDIRECT_ROUTES.some((r) => redirect.startsWith(r))) {
		return redirect;
	}
	return "/dashboard";
}
