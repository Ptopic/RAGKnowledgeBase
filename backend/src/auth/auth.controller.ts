import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Req,
} from "@nestjs/common";
import { Request } from "express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
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

	@Throttle({ default: { limit: 10, ttl: 900000 } })
	@Post("google")
	async googleLogin(@Body() body: GoogleLoginDto) {
		if (!body.token) {
			throw new BadRequestException("Google access token is required");
		}
		return this.authService.verifyGoogleToken(body.token);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("signup")
	async signup(@Body() body: SignupDto) {
		return this.authService.signup(body);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("login")
	async login(@Body() body: LoginDto) {
		return this.authService.login(body);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("forgot-password")
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		return this.authService.forgotPassword(body.email);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("reset-password")
	async resetPassword(@Body() body: ResetPasswordDto) {
		return this.authService.resetPassword(body.token, body.newPassword);
	}

	@SkipThrottle()
	@Get("me")
	@JwtAuth()
	me(@Req() req: Request) {
		return this.authService.me(req.user.id);
	}
}
