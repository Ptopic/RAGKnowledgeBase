import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private prisma: PrismaService) {
		super({
			// Accept the JWT from the Authorization header (used by REST
			// and the agent streaming endpoint) and from the `token`
			// query parameter (used by the browser's EventSource on
			// /sse/events — EventSource cannot set custom headers).
			// Reading JWTs from the query string is normally a
			// token-leak vector (proxy logs, browser history, Referer,
			// third-party scripts); deployment MUST use HTTPS and
			// SHOULD add `Referrer-Policy: no-referrer` so the token is
			// not forwarded to other origins. Other endpoints continue
			// to use the Authorization header and are unaffected.
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request: Request) => {
					const token = request?.query?.token as string | undefined;
					return token || null;
				},
			]),
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
