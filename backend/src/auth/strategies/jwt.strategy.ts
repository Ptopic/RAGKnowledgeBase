import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private prisma: PrismaService) {
		super({
			// SECURITY: tokens are accepted ONLY via the Authorization
			// Bearer header. Reading JWTs from the query string is a
			// token-leak vector (logged by reverse proxies, browser
			// history, Referer headers, third-party scripts).
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET,
		});
	}

	async validate(payload: any) {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, email: true, isSuperuser: true, isActive: true },
		});
		if (!user) {
			return { id: payload.sub, email: payload.email };
		}
		return { id: user.id, email: user.email, isSuperuser: user.isSuperuser, isActive: user.isActive };
	}
}
