import type { IUser } from "@api/auth/types";
import appConfig from "@shared/config";
import { COOKIE_NAME } from "@shared/constants/cookies";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_ROUTE = "/auth";
const HOME_ROUTE = "/dashboard";

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const accessToken = request.cookies.get(COOKIE_NAME.ACCESS_TOKEN)?.value;

	if (pathname === AUTH_ROUTE) {
		if (accessToken) {
			const isValid = await verifyToken(accessToken);
			if (isValid) {
				return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
			}
		}
		return NextResponse.next();
	}

	if (!accessToken) {
		return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
	}

	const isValid = await verifyToken(accessToken);
	if (!isValid) {
		const response = NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
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
