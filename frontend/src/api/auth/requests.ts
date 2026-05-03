import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	IAuthResponse,
	IForgotPasswordData,
	IGoogleAuthResponse,
	IGoogleLoginData,
	ILoginData,
	IMessageResponse,
	IResetPasswordData,
	ISignUpData,
	IUser,
} from "./types";

export const getCurrentUser =
	(request: ICallableRequestBuilder<IUser>) => async () =>
		request.call(`${config.apiUrl}/auth/me`);

export const signUpWithPassword =
	(request: ICallableRequestBuilder<IAuthResponse>) =>
	(signUpData: ISignUpData) =>
		request.call(`${config.apiUrl}/auth/signup`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(signUpData),
		}));

export const loginWithPassword =
	(request: ICallableRequestBuilder<IAuthResponse>) =>
	(loginData: ILoginData) =>
		request.call(`${config.apiUrl}/auth/login`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		}));

export const loginWithGoogle =
	(request: ICallableRequestBuilder<IGoogleAuthResponse>) =>
	(loginData: IGoogleLoginData) =>
		request.call(`${config.apiUrl}/auth/google`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		}));

export const forgotPassword =
	(request: ICallableRequestBuilder<IMessageResponse>) =>
	(data: IForgotPasswordData) =>
		request.call(`${config.apiUrl}/auth/forgot-password`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const resetPassword =
	(request: ICallableRequestBuilder<IMessageResponse>) =>
	(data: IResetPasswordData) =>
		request.call(`${config.apiUrl}/auth/reset-password`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));
