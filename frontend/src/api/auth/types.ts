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
	token: string;
}

export interface ILoginData {
	email: string;
	password: string;
}

export interface ISignUpData {
	email: string;
	password: string;
}

export interface IGoogleLoginData {
	token: string;
}
