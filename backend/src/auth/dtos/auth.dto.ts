import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class GoogleLoginDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: "Google OAuth access token" })
	token: string;
}

export class SignupDto {
	@IsEmail()
	@ApiProperty({ description: "User email" })
	email: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	@ApiProperty({ description: "User password (min 6 characters)" })
	password: string;

	@IsString()
	@IsOptional()
	@ApiProperty({ description: "User full name", required: false })
	fullName?: string;
}

export class LoginDto {
	@IsEmail()
	@ApiProperty({ description: "User email" })
	email: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: "User password" })
	password: string;
}

export class ForgotPasswordDto {
	@IsEmail()
	@ApiProperty({ description: "User email address" })
	email: string;
}

export class ResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: "Password reset token" })
	token: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	@ApiProperty({ description: "New password (min 6 characters)" })
	newPassword: string;
}

export class AuthResponseDto {
	@ApiProperty({ description: "JWT access token" })
	accessToken: string;

	@ApiProperty({ description: "JWT refresh token" })
	refreshToken: string;

	@ApiProperty({ description: "Token expiration time in seconds" })
	expiresIn: number;

	@ApiProperty({ description: "User information" })
	user: {
		id: string;
		email: string;
		fullName?: string;
		picture?: string;
	};
}
