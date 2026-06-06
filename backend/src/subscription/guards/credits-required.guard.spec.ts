import { BadRequestException, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
	REQUIRES_CREDITS_KEY,
} from "../decorators/requires-credits.decorator";
import { CreditsRequiredGuard } from "./credits-required.guard";

describe("CreditsRequiredGuard", () => {
	let guard: CreditsRequiredGuard;
	let reflector: Reflector;
	let subscriptionService: {
		isSuperuserBypass: jest.Mock;
		checkCredits: jest.Mock;
	};

	beforeEach(() => {
		reflector = new Reflector();
		subscriptionService = {
			isSuperuserBypass: jest.fn().mockResolvedValue(false),
			checkCredits: jest.fn().mockResolvedValue(true),
		};
		guard = new CreditsRequiredGuard(reflector, subscriptionService as any);
	});

	const makeContext = (userId?: string): ExecutionContext => {
		const request = userId ? { user: { id: userId } } : { user: undefined };
		return {
			switchToHttp: () => ({
				getRequest: () => request,
			}),
			getHandler: () => ({} as any),
			getClass: () => ({} as any),
		} as any;
	};

	describe("route without @RequiresCredits()", () => {
		it("passes through without calling the subscription service", async () => {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

			const result = await guard.canActivate(makeContext("user-1"));

			expect(result).toBe(true);
			expect(subscriptionService.isSuperuserBypass).not.toHaveBeenCalled();
			expect(subscriptionService.checkCredits).not.toHaveBeenCalled();
		});
	});

	describe("authenticated non-superuser with credits", () => {
		it("calls checkCredits and returns true", async () => {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(1);

			const result = await guard.canActivate(makeContext("user-1"));

			expect(result).toBe(true);
			expect(subscriptionService.isSuperuserBypass).toHaveBeenCalledWith("user-1");
			expect(subscriptionService.checkCredits).toHaveBeenCalledWith("user-1", 1);
		});

		it("forwards the @RequiresCredits(n) cost to checkCredits", async () => {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(5);

			await guard.canActivate(makeContext("user-1"));

			expect(subscriptionService.checkCredits).toHaveBeenCalledWith("user-1", 5);
		});
	});

	describe("superuser", () => {
		it("skips the credit check entirely", async () => {
			subscriptionService.isSuperuserBypass.mockResolvedValue(true);
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(1);

			const result = await guard.canActivate(makeContext("admin-1"));

			expect(result).toBe(true);
			expect(subscriptionService.checkCredits).not.toHaveBeenCalled();
		});
	});

	describe("out of credits", () => {
		it("propagates the error thrown by checkCredits", async () => {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(1);
			subscriptionService.checkCredits.mockRejectedValue(
				new BadRequestException("Credit limit exceeded. Used: 100/100."),
			);

			await expect(guard.canActivate(makeContext("user-1"))).rejects.toBeInstanceOf(
				BadRequestException,
			);
		});
	});

	describe("missing user", () => {
		it("fails closed when no user is attached to the request", async () => {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(1);

			const result = await guard.canActivate(makeContext(undefined));

			expect(result).toBe(false);
			expect(subscriptionService.checkCredits).not.toHaveBeenCalled();
		});
	});

	describe("metadata precedence", () => {
		it("reads metadata via the REQUIRES_CREDITS_KEY key", () => {
			const getAllAndOverride = jest
				.spyOn(reflector, "getAllAndOverride")
				.mockReturnValue(3);

			guard.canActivate(makeContext("user-1"));

			expect(getAllAndOverride).toHaveBeenCalledWith(
				REQUIRES_CREDITS_KEY,
				expect.any(Array),
			);
		});
	});
});
