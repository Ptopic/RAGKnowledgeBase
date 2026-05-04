export interface IUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	picture?: string;
}

export interface IAuthResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: IUser;
}

export interface IGoogleAuthResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	isNewUser: boolean;
	user: IUser;
}

export interface ILoginData {
	email: string;
	password: string;
}

export interface ISignUpData {
	email: string;
	password: string;
	fullName?: string;
}

export interface IGoogleLoginData {
	token: string;
}

export interface IForgotPasswordData {
	email: string;
}

export interface IResetPasswordData {
	token: string;
	newPassword: string;
}

export interface IMessageResponse {
	message: string;
}
