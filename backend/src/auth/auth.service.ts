import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
	) {}

	private async onAfterRegister(userId: string): Promise<void> {
		this.logger.log(`User ${userId} has registered.`);
	}

	async verifyGoogleToken(accessToken: string) {
		try {
			const tokenInfoResponse = await axios.get(
				`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
			);

			const userInfoResponse = await axios.get(
				`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
			);

			const { email, sub } = tokenInfoResponse.data;

			if (!email || !sub) {
				throw new UnauthorizedException("Invalid token payload");
			}

			const { name, picture } = userInfoResponse.data;

			let userId: string;
			let isNewUser = false;

			const existingUser = await this.prisma.user.findUnique({
				where: { email },
				include: { oauthAccounts: true },
			});

			if (!existingUser) {
				const newUser = await this.prisma.user.create({
					data: {
						email,
						fullName: name,
						picture,
						oauthAccounts: {
							create: {
								oauthName: "google",
								accountId: sub,
								accountEmail: email,
								accessToken: accessToken,
							},
						},
					},
				});

				userId = newUser.id;
				isNewUser = true;

				await this.onAfterRegister(userId);
			} else {
				userId = existingUser.id;

				const existingOAuthAccount = existingUser.oauthAccounts.find(
					(account) =>
						account.oauthName === "google" && account.accountId === sub,
				);

				if (!existingOAuthAccount) {
					await this.prisma.oAuthAccount.create({
						data: {
							userId: userId,
							oauthName: "google",
							accountId: sub,
							accountEmail: email,
							accessToken: accessToken,
						},
					});
				} else {
					await this.prisma.oAuthAccount.update({
						where: { id: existingOAuthAccount.id },
						data: { accessToken: accessToken },
					});
				}
			}

			const jwtToken = this.jwtService.sign({
				sub: userId,
				email,
			});

			return {
				token: jwtToken,
				isNewUser,
			};
		} catch (error) {
			this.logger.error("Google token verification failed:", error);
			throw new UnauthorizedException("Invalid Google access token");
		}
	}

	async me(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: {
				id: userId,
			},
			include: {
				oauthAccounts: {
					select: {
						oauthName: true,
						accountId: true,
					},
				},
				searchSpaces: {
					select: {
						id: true,
						name: true,
						description: true,
					},
				},
			},
		});

		return user;
	}

	async incrementPagesUsed(userId: string, pagesUsed: number): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: {
				pagesUsed: {
					increment: pagesUsed,
				},
			},
		});
	}

	async hasExceededPageLimit(userId: string): Promise<boolean> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { pagesLimit: true, pagesUsed: true },
		});

		if (!user) {
			throw new UnauthorizedException("User not found");
		}

		return user.pagesUsed >= user.pagesLimit;
	}
}
