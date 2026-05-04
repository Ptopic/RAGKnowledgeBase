import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { MailService } from "src/mail/mail.service";
import { PrismaService } from "src/prisma/prisma.service";

jest.mock("bcrypt", () => ({
	hash: jest.fn().mockResolvedValue("hashed-password"),
	compare: jest.fn().mockResolvedValue(true),
}));

const TEST_JWT_SECRET = "test-secret-key";

const mockUser = {
	id: "user-id",
	email: "test@example.com",
	hashedPassword: "hashed-password",
	isActive: true,
	isSuperuser: false,
	isVerified: false,
	fullName: "Test User",
	picture: null,
	failedLoginAttempts: 0,
	lockedUntil: null,
	resetToken: null,
	resetTokenExpires: null,
};

const mockGoogleUser = {
	...mockUser,
	hashedPassword: null,
	fullName: "Google User",
	picture: "http://pic.jpg",
};

const mockOAuthAccount = {
	id: "oauth-id",
	userId: "user-id",
	oauthName: "google",
	accountId: "google-sub-123",
	accountEmail: "test@example.com",
	accessToken: "google-token",
	expiresAt: null,
	refreshToken: null,
};

const mockPrisma = {
	user: {
		findUnique: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
	},
	oAuthAccount: {
		findUnique: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
	},
};

const mockMailService = {
	sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe("AuthService", () => {
	let service: AuthService;
	let prisma: typeof mockPrisma;
	let mailService: typeof mockMailService;
	let jwtService: JwtService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: PrismaService,
					useValue: mockPrisma,
				},
				{
					provide: MailService,
					useValue: mockMailService,
				},
				{
					provide: JwtService,
					useValue: new JwtService({
						secret: TEST_JWT_SECRET,
						signOptions: { expiresIn: "1h" },
					}),
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		prisma = module.get(PrismaService);
		mailService = module.get(MailService);
		jwtService = module.get<JwtService>(JwtService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("signup", () => {
		it("should create a new user and return tokens", async () => {
			const body = {
				email: "new@example.com",
				password: "password123",
				fullName: "New User",
			};
			prisma.user.findUnique.mockResolvedValue(null);
			prisma.user.create.mockResolvedValue({
				id: "new-id",
				email: body.email,
				fullName: body.fullName,
			});

			const result = await service.signup(body);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: body.email },
			});
			expect(prisma.user.create).toHaveBeenCalled();
			expect(result).toHaveProperty("accessToken");
			expect(result).toHaveProperty("refreshToken");
			expect(result).toHaveProperty("user");
			expect(result.user.email).toBe(body.email);
		});

		it("should throw ConflictException when email already exists", async () => {
			const body = {
				email: "existing@example.com",
				password: "password123",
			};
			prisma.user.findUnique.mockResolvedValue({ id: "1", email: body.email });

			await expect(service.signup(body)).rejects.toThrow(ConflictException);
		});

		it("should hash password with bcrypt before storing", async () => {
			const body = { email: "new@example.com", password: "mypassword" };
			prisma.user.findUnique.mockResolvedValue(null);
			prisma.user.create.mockResolvedValue({
				id: "new-id",
				email: body.email,
				fullName: null,
			});

			await service.signup(body);

			expect(bcrypt.hash).toHaveBeenCalledWith(body.password, 10);
			expect(prisma.user.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						hashedPassword: "hashed-password",
					}),
				}),
			);
		});
	});

	describe("login", () => {
		it("should return tokens for valid credentials", async () => {
			const body = { email: "test@example.com", password: "password123" };
			prisma.user.findUnique.mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const result = await service.login(body);

			expect(result).toHaveProperty("accessToken");
			expect(result).toHaveProperty("refreshToken");
			expect(result.user.email).toBe(body.email);
		});

		it("should throw UnauthorizedException for non-existent user", async () => {
			const body = { email: "nonexistent@example.com", password: "pass" };
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(service.login(body)).rejects.toThrow(
				new UnauthorizedException("Invalid credentials"),
			);
		});

		it("should throw UnauthorizedException for invalid password", async () => {
			const body = { email: "test@example.com", password: "wrongpass" };
			prisma.user.findUnique.mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.login(body)).rejects.toThrow(
				new UnauthorizedException("Invalid credentials"),
			);
		});

		it("should throw for Google-only accounts", async () => {
			const body = { email: "google@example.com", password: "any" };
			prisma.user.findUnique.mockResolvedValue(mockGoogleUser);

			await expect(service.login(body)).rejects.toThrow(
				new UnauthorizedException(
					"This account was created via Google. Please use Google sign-in.",
				),
			);
		});

		it("should lock account after 5 failed attempts", async () => {
			const body = { email: "test@example.com", password: "wrong" };
			const userWithFailures = { ...mockUser, failedLoginAttempts: 4 };
			prisma.user.findUnique.mockResolvedValue(userWithFailures);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.login(body)).rejects.toThrow(UnauthorizedException);

			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: mockUser.id },
				data: expect.objectContaining({
					lockedUntil: expect.any(Date),
				}),
			});
		});

		it("should reject login when account is locked", async () => {
			const body = { email: "test@example.com", password: "password123" };
			const lockedUser = {
				...mockUser,
				lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
			};
			prisma.user.findUnique.mockResolvedValue(lockedUser);

		await expect(service.login(body)).rejects.toThrow("Account locked. Try again in 10 minute(s).");
		});

		it("should reset failedLoginAttempts on successful login", async () => {
			const body = { email: "test@example.com", password: "password123" };
			const userWithFailures = {
				...mockUser,
				failedLoginAttempts: 3,
			};
			prisma.user.findUnique.mockResolvedValue(userWithFailures);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			await service.login(body);

			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: mockUser.id },
				data: { failedLoginAttempts: 0, lockedUntil: null },
			});
		});
	});

	describe("forgotPassword", () => {
		it("should generate reset token and send email for existing user", async () => {
			const email = "test@example.com";
			prisma.user.findUnique.mockResolvedValue(mockUser);
			prisma.user.update.mockResolvedValue(mockUser);

			const result = await service.forgotPassword(email);

			expect(prisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: mockUser.id },
					data: expect.objectContaining({
						resetToken: expect.any(String),
						resetTokenExpires: expect.any(Date),
					}),
				}),
			);
			expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
				email,
				expect.any(String),
			);
			expect(result).toEqual({ message: "Password reset email sent" });
		});

		it("should return same message for non-existent user (anti-enumeration)", async () => {
			const email = "nonexistent@example.com";
			prisma.user.findUnique.mockResolvedValue(null);

			const result = await service.forgotPassword(email);

			expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
			expect(result).toEqual({ message: "Password reset email sent" });
		});

		it("should reject for Google-only accounts", async () => {
			const email = "google@example.com";
			prisma.user.findUnique.mockResolvedValue(mockGoogleUser);

			await expect(service.forgotPassword(email)).rejects.toThrow(
				new UnauthorizedException(
					"This account was created via Google. Please use Google sign-in.",
				),
			);
		});
	});

	describe("resetPassword", () => {
		it("should reset password with valid token", async () => {
			const token = "valid-token";
			const newPassword = "newpass123";
			const userWithToken = {
				...mockUser,
				resetToken: token,
				resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
			};
			prisma.user.findUnique.mockResolvedValue(userWithToken);
			prisma.user.update.mockResolvedValue(userWithToken);

			const result = await service.resetPassword(token, newPassword);

			expect(prisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: mockUser.id },
					data: expect.objectContaining({
						hashedPassword: expect.any(String),
						resetToken: null,
						resetTokenExpires: null,
					}),
				}),
			);
			expect(result).toEqual({ message: "Password updated successfully" });
		});

		it("should reject invalid token", async () => {
			const token = "invalid-token";
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(service.resetPassword(token, "newpass")).rejects.toThrow(
				new UnauthorizedException("Invalid or expired reset token"),
			);
		});

		it("should reject expired token", async () => {
			const token = "expired-token";
			const userWithExpiredToken = {
				...mockUser,
				resetToken: token,
				resetTokenExpires: new Date(Date.now() - 60 * 60 * 1000),
			};
			prisma.user.findUnique.mockResolvedValue(userWithExpiredToken);

			await expect(service.resetPassword(token, "newpass")).rejects.toThrow(
				new UnauthorizedException("Reset token has expired"),
			);
		});
	});

	describe("verifyGoogleToken", () => {
		it("should be implemented in e2e tests", async () => {
			expect(true).toBe(true);
		});
	});

	describe("me", () => {
		it("should return user with oauth accounts and search spaces", async () => {
			const userId = "user-id";
			const expected = {
				id: userId,
				email: "test@example.com",
				oauthAccounts: [{ oauthName: "google", accountId: "123" }],
				searchSpaces: [{ id: 1, name: "Space", description: null }],
			};
			prisma.user.findUnique.mockResolvedValue(expected);

			const result = await service.me(userId);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: userId },
				include: expect.any(Object),
			});
			expect(result).toEqual(expected);
		});

		it("should return null for non-existent user", async () => {
			const userId = "nonexistent";
			prisma.user.findUnique.mockResolvedValue(null);

			const result = await service.me(userId);

			expect(result).toBeNull();
		});
	});
});
