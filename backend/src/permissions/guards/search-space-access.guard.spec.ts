import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MemberRole } from "@prisma/client";
import { SearchSpaceAccessGuard, SEARCH_SPACE_ROLES_KEY, SEARCH_SPACE_CONTEXT_KEY } from "../index";

describe("SearchSpaceAccessGuard", () => {
	let guard: SearchSpaceAccessGuard;
	let reflector: Reflector;
	let permissionsService: any;

	beforeEach(() => {
		reflector = new Reflector();
		permissionsService = {
			getMembership: jest.fn(),
		};
		guard = new SearchSpaceAccessGuard(reflector, permissionsService);
	});

	const createMockContext = (
		params: Record<string, string> = {},
		query: Record<string, string> = {},
		body: Record<string, unknown> = {},
		userId?: string,
		roles?: MemberRole[],
		requiresContext?: boolean,
	) => {
		const request: any = {
			params,
			query,
			body,
			user: userId ? { id: userId } : undefined,
		};

		const handler: any = {};
		const classRef: any = {};

		const metadata: Record<string, any> = {};
		if (roles) {
			metadata[SEARCH_SPACE_ROLES_KEY] = roles;
		}
		if (requiresContext) {
			metadata[SEARCH_SPACE_CONTEXT_KEY] = true;
		}

		if (Object.keys(metadata).length > 0) {
			jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key: string) => metadata[key]);
		} else {
			jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
		}

		return {
			switchToHttp: () => ({
				getRequest: () => request,
			}),
			getHandler: () => handler,
			getClass: () => classRef,
		} as any;
	};

	describe("no metadata", () => {
		it("should allow access when no metadata is set", async () => {
			const context = createMockContext({}, {}, {}, "user-1");

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).not.toHaveBeenCalled();
		});
	});

	describe("@RequireSearchSpaceContext", () => {
		it("should attach searchSpaceContext when context is required and searchSpaceId is present", async () => {
			const context = createMockContext(
				{ searchSpaceId: "5" },
				{},
				{},
				"user-1",
				undefined,
				true,
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext).toEqual({ searchSpaceId: 5, membership: undefined });
		});

		it("should throw BadRequestException when context is required but searchSpaceId is missing", async () => {
			const context = createMockContext(
				{},
				{},
				{},
				"user-1",
				undefined,
				true,
			);

			await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
			await expect(guard.canActivate(context)).rejects.toThrow("search_space_id is required");
		});

		it("should throw ForbiddenException when context is required but user is not authenticated", async () => {
			const context = createMockContext(
				{ searchSpaceId: "1" },
				{},
				{},
				undefined,
				undefined,
				true,
			);

			await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
		});

		it("should extract searchSpaceId from query.search_space_id for context", async () => {
			const context = createMockContext(
				{},
				{ search_space_id: "3" },
				{},
				"user-1",
				undefined,
				true,
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext?.searchSpaceId).toBe(3);
		});

		it("should extract searchSpaceId from body.search_space_id for context", async () => {
			const context = createMockContext(
				{},
				{},
				{ search_space_id: 7 },
				"user-1",
				undefined,
				true,
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext?.searchSpaceId).toBe(7);
		});
	});

	describe("@RequireSearchSpaceRole", () => {
		it("should deny access when user is not authenticated", async () => {
			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				undefined,
				[MemberRole.VIEWER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
		});

		it("should extract searchSpaceId from params.id", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.OWNER,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.OWNER],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(1, "user-1");
		});

		it("should extract searchSpaceId from params.searchSpaceId", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 5,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ searchSpaceId: "5" },
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(5, "user-1");
		});

		it("should extract searchSpaceId from query.search_space_id", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 3,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{},
				{ search_space_id: "3" },
				{},
				"user-1",
				[MemberRole.EDITOR],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(3, "user-1");
		});

		it("should extract searchSpaceId from body.search_space_id", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 7,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{},
				{},
				{ search_space_id: 7 },
				"user-1",
				[MemberRole.EDITOR],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(7, "user-1");
		});

		it("should throw NotFoundException when user has no membership", async () => {
			permissionsService.getMembership.mockResolvedValue(null);

			const context = createMockContext(
				{ id: "99" },
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
		});

		it("should throw NotFoundException (non-enumerating) for no access", async () => {
			permissionsService.getMembership.mockResolvedValue(null);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			try {
				await guard.canActivate(context);
				fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundException);
				expect(error.message).not.toContain("member");
				expect(error.message).not.toContain("role");
			}
		});

		it("should throw ForbiddenException when role is insufficient", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.OWNER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
		});

		it("should allow VIEWER role for @RequireSearchSpaceRole(VIEWER)", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			expect(await guard.canActivate(context)).toBe(true);
		});

		it("should allow OWNER role for @RequireSearchSpaceRole(EDITOR)", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.OWNER,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.EDITOR],
			);

			expect(await guard.canActivate(context)).toBe(true);
		});

		it("should attach membership to request on success", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "1" },
				{},
				{},
				"user-1",
				[MemberRole.EDITOR],
			);

			await guard.canActivate(context);

			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceMembership).toEqual(membership);
		});

		it("should throw BadRequestException when searchSpaceId cannot be extracted", async () => {
			const context = createMockContext(
				{},
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
			await expect(guard.canActivate(context)).rejects.toThrow("search_space_id is required");
		});

		it("should attach searchSpaceContext with membership when role check passes (no @RequireSearchSpaceContext needed)", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 7,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{},
				{},
				{ search_space_id: 7 },
				"user-1",
				[MemberRole.EDITOR],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext).toEqual({
				searchSpaceId: 7,
				membership,
			});
			expect(request.searchSpaceMembership).toEqual(membership);
		});

		it("should prefer query.search_space_id over params.id when both present", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 50,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "99" },
				{ search_space_id: "50" },
				{},
				"user-1",
				[MemberRole.EDITOR],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(50, "user-1");
		});

		it("should prefer body.search_space_id over params.id when both present", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 30,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "99" },
				{},
				{ search_space_id: 30 },
				"user-1",
				[MemberRole.EDITOR],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(30, "user-1");
		});

		it("should fall back to params.id when no explicit search_space_id is provided", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.OWNER,
				searchSpaceId: 99,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ id: "99" },
				{},
				{},
				"user-1",
				[MemberRole.OWNER],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect(permissionsService.getMembership).toHaveBeenCalledWith(99, "user-1");
		});
	});

	describe("list endpoint with @RequireSearchSpaceRole(VIEWER) via query.search_space_id", () => {
		it("should throw BadRequestException when search_space_id query param is missing", async () => {
			const context = createMockContext(
				{},
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
			await expect(guard.canActivate(context)).rejects.toThrow("search_space_id is required");
		});

		it("should throw NotFoundException when user has no membership in the space", async () => {
			permissionsService.getMembership.mockResolvedValue(null);

			const context = createMockContext(
				{},
				{ search_space_id: "5" },
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
		});

		it("should throw NotFoundException (non-enumerating) for no access on list endpoint", async () => {
			permissionsService.getMembership.mockResolvedValue(null);

			const context = createMockContext(
				{},
				{ search_space_id: "1" },
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			try {
				await guard.canActivate(context);
				fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundException);
				expect(error.message).not.toContain("member");
				expect(error.message).not.toContain("role");
			}
		});

		it("should allow VIEWER membership and attach context for list endpoint", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 5,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{},
				{ search_space_id: "5" },
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext).toEqual({
				searchSpaceId: 5,
				membership,
			});
			expect(request.searchSpaceMembership).toEqual(membership);
		});

		it("should allow EDITOR membership for VIEWER-required list endpoint", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.EDITOR,
				searchSpaceId: 5,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{},
				{ search_space_id: "5" },
				{},
				"user-1",
				[MemberRole.VIEWER],
			);

			expect(await guard.canActivate(context)).toBe(true);
		});
	});

	describe("combined @RequireSearchSpaceContext + @RequireSearchSpaceRole", () => {
		it("should throw BadRequestException when searchSpaceId missing (both context and role present)", async () => {
			const context = createMockContext(
				{},
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
				true,
			);

			await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
		});

		it("should attach searchSpaceContext with membership when both context and role are present and pass", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 5,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ searchSpaceId: "5" },
				{},
				{},
				"user-1",
				[MemberRole.VIEWER],
				true,
			);

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			const request = context.switchToHttp().getRequest();
			expect(request.searchSpaceContext).toEqual({
				searchSpaceId: 5,
				membership,
			});
			expect(request.searchSpaceMembership).toEqual(membership);
		});

		it("should reject with role-appropriate error when context passes but role insufficient", async () => {
			const membership = {
				id: "mem-1",
				role: MemberRole.VIEWER,
				searchSpaceId: 1,
				userId: "user-1",
				invitedById: "user-1",
				createdAt: new Date(),
			};
			permissionsService.getMembership.mockResolvedValue(membership);

			const context = createMockContext(
				{ searchSpaceId: "1" },
				{},
				{},
				"user-1",
				[MemberRole.EDITOR],
				true,
			);

			await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
		});
	});
});
