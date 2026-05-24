import type { IUser } from "@api/auth/types";
import appConfig from "@shared/config";
import { COOKIE_NAME } from "@shared/constants/cookies";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_PUBLIC_ROUTES = [
	"/auth",
	"/auth/forgot-password",
	"/auth/reset-password",
	"/s",
];
const HOME_ROUTE = "/dashboard";

/** Prevent open-redirect: only allow relative internal paths */
function isSafeRedirect(url: string): boolean {
	return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const accessToken = request.cookies.get(COOKIE_NAME.ACCESS_TOKEN)?.value;

	const isPublicAuthRoute = AUTH_PUBLIC_ROUTES.some((route) =>
		pathname.startsWith(route),
	);

	const buildLoginRedirectUrl = () => {
		const loginUrl = new URL(AUTH_PUBLIC_ROUTES[0], request.url);
		if (pathname !== AUTH_PUBLIC_ROUTES[0]) {
			loginUrl.searchParams.set("redirect", pathname + search);
		}
		return loginUrl;
	};

	if (isPublicAuthRoute) {
		if (pathname === AUTH_PUBLIC_ROUTES[0] && accessToken) {
			const isValid = await verifyToken(accessToken);
			if (isValid) {
				const redirectUrl = request.nextUrl.searchParams.get("redirect");
				if (redirectUrl && isSafeRedirect(redirectUrl)) {
					return NextResponse.redirect(new URL(redirectUrl, request.url));
				}
				return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
			}
		}
		return NextResponse.next();
	}

	if (!accessToken) {
		return NextResponse.redirect(buildLoginRedirectUrl());
	}

	const isValid = await verifyToken(accessToken);
	if (!isValid) {
		const response = NextResponse.redirect(buildLoginRedirectUrl());
		response.cookies.delete(COOKIE_NAME.ACCESS_TOKEN);
		return response;
	}

	return NextResponse.next();
}

async function verifyToken(accessToken: string): Promise<boolean> {
	if (!appConfig.apiUrl) {
		return false;
	}

	try {
		const response = await fetch(`${appConfig.apiUrl}/auth/me`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			cache: "no-store",
		});

		if (!response.ok) {
			return false;
		}

		const user = (await response.json()) as IUser;
		return !!user;
	} catch (error) {
		console.error("Token verification failed:", error);
		return false;
	}
}
