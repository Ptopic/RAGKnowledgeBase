import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuth } from './decorators/jwt-auth.decorator';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	// @Post('register')
	// register(@Body() payload: AuthPayloadDto) {
	// 	return this.authService.register(payload);
	// }

	// @Post('login')
	// login(@Body() payload: AuthPayloadDto) {
	// 	return this.authService.login(payload);
	// }

	@Post('google')
	async googleLogin(
		@Body() body: { token: string; pushNotificationId: string }
	) {
		if (!body.token) {
			throw new Error('Authorization code is missing');
		}
		return this.authService.verifyGoogleToken(
			body.token,
			body.pushNotificationId
		);
	}

	@Get('me')
	@JwtAuth()
	me(@Req() req: Request) {
		return this.authService.me(req.user.userId);
	}
}
