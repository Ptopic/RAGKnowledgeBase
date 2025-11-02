export interface IUser {
   id: string;
   email: string;
   firstName: string;
   lastName: string;
}

export interface IAuthResponse {
   accessToken: string;
   refreshToken: string;
   expiresIn: number;
   user: IUser;
}

export interface ILoginData {
   email: string;
   password: string;
}

export interface ISignUpData {
   email: string;
   password: string;
}
