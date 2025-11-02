"use client";

import type { IGoogleAuthResponse } from "@api/auth/types";
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
	setCookieNext(COOKIE_NAME.ACCESS_TOKEN, authResponse.token, {
		maxAge: 60 * 60 * 24 * 30, // 30 days
		secure: true,
		sameSite: "lax",
	});
};

export const removeAuthToken = () => {
	deleteCookie(COOKIE_NAME.ACCESS_TOKEN);
};
