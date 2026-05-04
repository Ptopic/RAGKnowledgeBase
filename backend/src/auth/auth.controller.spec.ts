import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: AuthService;

	const mockAuthService = {
		signup: jest.fn(),
		login: jest.fn(),
		verifyGoogleToken: jest.fn(),
		forgotPassword: jest.fn(),
		resetPassword: jest.fn(),
		me: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: mockAuthService,
				},
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
		authService = module.get<AuthService>(AuthService);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /auth/signup", () => {
		it("should call authService.signup with body", async () => {
			const body = {
				email: "test@example.com",
				password: "password123",
				fullName: "Test User",
			};
			const expected = {
				accessToken: "token",
				refreshToken: "refresh",
				expiresIn: 3600,
				user: { id: "1", email: body.email, fullName: body.fullName },
			};
			mockAuthService.signup.mockResolvedValue(expected);

			const result = await controller.signup(body);

			expect(authService.signup).toHaveBeenCalledWith(body);
			expect(result).toEqual(expected);
		});
	});

	describe("POST /auth/login", () => {
		it("should call authService.login with body", async () => {
			const body = { email: "test@example.com", password: "password123" };
			const expected = {
				accessToken: "token",
				refreshToken: "refresh",
				expiresIn: 3600,
				user: { id: "1", email: body.email, fullName: "Test User" },
			};
			mockAuthService.login.mockResolvedValue(expected);

			const result = await controller.login(body);

			expect(authService.login).toHaveBeenCalledWith(body);
			expect(result).toEqual(expected);
		});
	});

	describe("POST /auth/google", () => {
		it("should call authService.verifyGoogleToken with token", async () => {
			const body = { token: "google-access-token" };
			const expected = {
				accessToken: "token",
				refreshToken: "refresh",
				expiresIn: 3600,
				isNewUser: false,
				user: { id: "1", email: "test@example.com" },
			};
			mockAuthService.verifyGoogleToken.mockResolvedValue(expected);

			const result = await controller.googleLogin(body);

			expect(authService.verifyGoogleToken).toHaveBeenCalledWith(body.token);
			expect(result).toEqual(expected);
		});

		it("should throw BadRequestException when token is missing", async () => {
			const body = { token: "" };

			await expect(controller.googleLogin(body)).rejects.toThrow(
				"Google access token is required",
			);
		});
	});

	describe("POST /auth/forgot-password", () => {
		it("should call authService.forgotPassword with email", async () => {
			const body = { email: "test@example.com" };
			const expected = { message: "Password reset email sent" };
			mockAuthService.forgotPassword.mockResolvedValue(expected);

			const result = await controller.forgotPassword(body);

			expect(authService.forgotPassword).toHaveBeenCalledWith(body.email);
			expect(result).toEqual(expected);
		});
	});

	describe("POST /auth/reset-password", () => {
		it("should call authService.resetPassword with token and newPassword", async () => {
			const body = { token: "reset-token", newPassword: "newpass123" };
			const expected = { message: "Password updated successfully" };
			mockAuthService.resetPassword.mockResolvedValue(expected);

			const result = await controller.resetPassword(body);

			expect(authService.resetPassword).toHaveBeenCalledWith(
				body.token,
				body.newPassword,
			);
			expect(result).toEqual(expected);
		});
	});

	describe("GET /auth/me", () => {
		it("should call authService.me with user id from request", async () => {
			const req = { user: { id: "user-id" } } as any;
			const expected = {
				id: "user-id",
				email: "test@example.com",
			};
			mockAuthService.me.mockResolvedValue(expected);

			const result = await controller.me(req);

			expect(authService.me).toHaveBeenCalledWith("user-id");
			expect(result).toEqual(expected);
		});
	});
});
