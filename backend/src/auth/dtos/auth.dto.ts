import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class AuthPayloadDto {
	@IsEmail()
	@IsString()
	@IsNotEmpty()
	@ApiProperty()
	email: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty()
	password: string;
}

export class GoogleLoginDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: "Google OAuth access token" })
	token: string;
}
