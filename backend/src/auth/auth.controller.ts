import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Req,
} from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuth } from "./decorators/jwt-auth.decorator";
import {
	ForgotPasswordDto,
	GoogleLoginDto,
	LoginDto,
	ResetPasswordDto,
	SignupDto,
} from "./dtos/auth.dto";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("google")
	async googleLogin(@Body() body: GoogleLoginDto) {
		if (!body.token) {
			throw new BadRequestException("Google access token is required");
		}
		return this.authService.verifyGoogleToken(body.token);
	}

	@Post("signup")
	async signup(@Body() body: SignupDto) {
		return this.authService.signup(body);
	}

	@Post("login")
	async login(@Body() body: LoginDto) {
		return this.authService.login(body);
	}

	@Post("forgot-password")
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		return this.authService.forgotPassword(body.email);
	}

	@Post("reset-password")
	async resetPassword(@Body() body: ResetPasswordDto) {
		return this.authService.resetPassword(body.token, body.newPassword);
	}

	@Get("me")
	@JwtAuth()
	me(@Req() req: Request) {
		return this.authService.me(req.user.id);
	}
}
