import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService
	) {}

	async verifyGoogleToken(accessToken: string, pushNotificationId: string) {
		try {
			const tokenInfoResponse = await axios.get(
				`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
			);

			const userInfoResponse = await axios.get(
				`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
			);

			const { email, sub } = tokenInfoResponse.data;

			if (!email || !sub) {
				throw new UnauthorizedException('Invalid token payload');
			}

			const { name, picture } = userInfoResponse.data;

			let userId;

			const existingUser = await this.prisma.user.findUnique({
				where: {
					email,
				},
			});

			if (!existingUser) {
				const newUser = await this.prisma.user.create({
					data: {
						email,
						fullName: name,
						picture,
						pushNotificationId,
					},
				});

				userId = newUser.id;
			} else {
				userId = existingUser.id;
				await this.prisma.user.update({
					where: { id: userId },
					data: { pushNotificationId },
				});
			}

			const jwtToken = this.jwtService.sign({
				sub: userId,
				email,
			});

			return {
				token: jwtToken,
			};
		} catch (error) {
			console.error('Google token verification failed:', error);
			throw new UnauthorizedException('Invalid Google access token');
		}
	}

	async me(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		return user;
	}

	// async register(payload: AuthPayloadDto) {
	// 	const newUser = await this.prisma.user.create({
	// 		data: {
	// 			email: payload.email,
	// 			password: await bcrypt.hash(payload.password, 10),
	// 		},
	// 	});

	// 	const token = await this.jwtService.signAsync({
	// 		sub: newUser.id,
	// 		email: newUser.email,
	// 	});

	// 	return { token };
	// }

	// async login(payload: AuthPayloadDto) {
	// 	const user = await this.prisma.user.findUnique({
	// 		where: {
	// 			email: payload.email,
	// 		},
	// 	});

	// 	if (!user) {
	// 		throw new ForbiddenException('Access denied');
	// 	}

	// 	const passwordMatches = await bcrypt.compare(
	// 		payload.password,
	// 		user.password
	// 	);

	// 	if (!passwordMatches) {
	// 		throw new ForbiddenException('Access denied');
	// 	}

	// 	const token = await this.jwtService.signAsync({
	// 		sub: user.id,
	// 		email: user.email,
	// 	});

	// 	return { token };
	// }
}
