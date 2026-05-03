"use client";

import type { IAuthResponse, IGoogleAuthResponse } from "@api/auth/types";
import { COOKIE_NAME } from "@shared/constants/cookies";
import {
	deleteCookie,
	getCookie,
	setCookie as setCookieNext,
} from "cookies-next";

export const getAccessTokenClient = () => {
	return getCookie(COOKIE_NAME.ACCESS_TOKEN);
};

export const setAuthToken = (authResponse: IGoogleAuthResponse) => {
	setCookieNext(COOKIE_NAME.ACCESS_TOKEN, authResponse.accessToken, {
		maxAge: 60 * 60 * 24 * 30,
		secure: true,
		sameSite: "lax",
	});
	if (authResponse.refreshToken) {
		setCookieNext(COOKIE_NAME.REFRESH_TOKEN, authResponse.refreshToken, {
			secure: true,
			sameSite: "lax",
		});
	}
};

export const setAuthTokens = (authResponse: IAuthResponse) => {
	setCookieNext(COOKIE_NAME.ACCESS_TOKEN, authResponse.accessToken, {
		maxAge: 60 * 60 * 24 * 30,
		secure: true,
		sameSite: "lax",
	});
	setCookieNext(COOKIE_NAME.REFRESH_TOKEN, authResponse.refreshToken, {
		secure: true,
		sameSite: "lax",
	});
};

export const removeAuthToken = () => {
	deleteCookie(COOKIE_NAME.ACCESS_TOKEN);
	deleteCookie(COOKIE_NAME.REFRESH_TOKEN);
};
