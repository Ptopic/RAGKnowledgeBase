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
import { GoogleLoginDto } from "./dtos/auth.dto";

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

	@Get("me")
	@JwtAuth()
	me(@Req() req: Request) {
		return this.authService.me(req.user.id);
	}
}
