import {
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { MailService } from "src/mail/mail.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private mailService: MailService,
	) {}

	private async onAfterRegister(userId: string): Promise<void> {
		this.logger.log(`User ${userId} has registered.`);
	}

	private generateTokens(userId: string, email: string) {
		const accessToken = this.jwtService.sign(
			{ sub: userId, email },
			{ expiresIn: "1h" },
		);
		const refreshToken = this.jwtService.sign(
			{ sub: userId, email },
			{ expiresIn: "30d" },
		);
		return {
			accessToken,
			refreshToken,
			expiresIn: 3600,
		};
	}

	async signup(body: { email: string; password: string; fullName?: string }) {
		const { email, password, fullName } = body;

		const existingUser = await this.prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			throw new ConflictException("User with this email already exists");
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = await this.prisma.user.create({
			data: {
				email,
				hashedPassword,
				fullName: fullName || null,
			},
		});

		await this.onAfterRegister(newUser.id);

		const tokens = this.generateTokens(newUser.id, newUser.email);

		return {
			...tokens,
			user: {
				id: newUser.id,
				email: newUser.email,
				fullName: newUser.fullName,
				picture: newUser.picture,
			},
		};
	}

	async login(body: { email: string; password: string }) {
		const { email, password } = body;

		const user = await this.prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		if (user.lockedUntil && user.lockedUntil > new Date()) {
			const minutesLeft = Math.ceil(
				(user.lockedUntil.getTime() - Date.now()) / 60000,
			);
			throw new UnauthorizedException(
				`Account locked. Try again in ${minutesLeft} minute(s).`,
			);
		}

		if (!user.isActive) {
			throw new ForbiddenException(
				"Account has been disabled. Contact your administrator.",
			);
		}

		if (!user.hashedPassword) {
			throw new UnauthorizedException(
				"This account was created via Google. Please use Google sign-in.",
			);
		}

		const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

		if (!isPasswordValid) {
			const newFailedAttempts = user.failedLoginAttempts + 1;
			const updateData: any = { failedLoginAttempts: newFailedAttempts };

			if (newFailedAttempts >= 5) {
				updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
			}

			await this.prisma.user.update({
				where: { id: user.id },
				data: updateData,
			});

			throw new UnauthorizedException("Invalid credentials");
		}

		if (user.failedLoginAttempts > 0 || user.lockedUntil) {
			await this.prisma.user.update({
				where: { id: user.id },
				data: { failedLoginAttempts: 0, lockedUntil: null },
			});
		}

		const tokens = this.generateTokens(user.id, user.email);

		return {
			...tokens,
			user: {
				id: user.id,
				email: user.email,
				fullName: user.fullName,
				picture: user.picture,
			},
		};
	}

	async forgotPassword(email: string) {
		const user = await this.prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			return { message: "Password reset email sent" };
		}

		if (!user.isActive) {
			throw new ForbiddenException(
				"Account has been disabled. Contact your administrator.",
			);
		}

		if (!user.hashedPassword) {
			throw new UnauthorizedException(
				"This account was created via Google. Please use Google sign-in.",
			);
		}

		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				resetToken: token,
				resetTokenExpires: expiresAt,
			},
		});

		await this.mailService.sendPasswordResetEmail(email, token);

		return { message: "Password reset email sent" };
	}

	async resetPassword(token: string, newPassword: string) {
		const user = await this.prisma.user.findUnique({
			where: { resetToken: token },
		});

		if (!user) {
			throw new UnauthorizedException("Invalid or expired reset token");
		}

		if (!user.isActive) {
			throw new ForbiddenException(
				"Account has been disabled. Contact your administrator.",
			);
		}

		if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
			throw new UnauthorizedException("Reset token has expired");
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				hashedPassword,
				resetToken: null,
				resetTokenExpires: null,
			},
		});

		return { message: "Password updated successfully" };
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

				if (!existingUser.isActive) {
					throw new ForbiddenException(
						"Account has been disabled. Contact your administrator.",
					);
				}

				if (!existingUser.fullName && name) {
					await this.prisma.user.update({
						where: { id: userId },
						data: { fullName: name },
					});
				}
				if (!existingUser.picture && picture) {
					await this.prisma.user.update({
						where: { id: userId },
						data: { picture },
					});
				}

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

			const tokens = this.generateTokens(userId, email);

			return {
				...tokens,
				isNewUser,
				user: {
					id: userId,
					email,
					fullName: name,
					picture,
				},
			};
		} catch (error) {
			if (
				error instanceof ForbiddenException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
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

		if (user && !user.isActive) {
			throw new ForbiddenException(
				"Account has been disabled. Contact your administrator.",
			);
		}

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
