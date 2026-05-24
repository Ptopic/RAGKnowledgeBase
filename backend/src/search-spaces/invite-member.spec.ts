import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { SearchSpacesService } from "./search-spaces.service";

const INVITE_SUCCESS_MESSAGE =
	"If the user exists, they will be added to this search space.";

describe("SearchSpacesService — inviteMember (non-enumeration)", () => {
	let service: SearchSpacesService;
	let prisma: any;
	let permissionsService: any;

	beforeEach(async () => {
		prisma = {
			user: {
				findUnique: jest.fn(),
			},
			searchSpaceMember: {
				findUnique: jest.fn(),
				create: jest.fn(),
			},
		};

		permissionsService = {
			getMembership: jest.fn(),
			getSearchSpacesForUser: jest.fn(),
			getAccessibleSearchSpaceIds: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SearchSpacesService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: PermissionsService, useValue: permissionsService },
			],
		}).compile();

		service = module.get<SearchSpacesService>(SearchSpacesService);
	});

	const ownerId = "owner-user-id";
	const searchSpaceId = 1;

	it("should return identical response shape when user exists and is invited", async () => {
		prisma.user.findUnique.mockResolvedValue({
			id: "invitee-id",
			email: "invitee@example.com",
			fullName: "Invitee",
			picture: null,
		});
		prisma.searchSpaceMember.findUnique.mockResolvedValue(null);
		prisma.searchSpaceMember.create.mockResolvedValue({
			id: "member-id",
			searchSpaceId,
			userId: "invitee-id",
			role: MemberRole.VIEWER,
			invitedById: ownerId,
			createdAt: new Date(),
		});

		const result = await service.inviteMember(
			searchSpaceId,
			{ email: "invitee@example.com", role: MemberRole.VIEWER },
			ownerId,
		);

		expect(result).toEqual({ message: INVITE_SUCCESS_MESSAGE });
	});

	it("should return identical response shape when user does NOT exist", async () => {
		prisma.user.findUnique.mockResolvedValue(null);

		const result = await service.inviteMember(
			searchSpaceId,
			{ email: "nonexistent@example.com", role: MemberRole.VIEWER },
			ownerId,
		);

		expect(result).toEqual({ message: INVITE_SUCCESS_MESSAGE });
		expect(prisma.searchSpaceMember.findUnique).not.toHaveBeenCalled();
		expect(prisma.searchSpaceMember.create).not.toHaveBeenCalled();
	});

	it("should return identical response shape when user is already a member", async () => {
		prisma.user.findUnique.mockResolvedValue({
			id: "existing-member-id",
			email: "existing@example.com",
			fullName: "Existing",
			picture: null,
		});
		prisma.searchSpaceMember.findUnique.mockResolvedValue({
			id: "existing-membership-id",
			searchSpaceId,
			userId: "existing-member-id",
			role: MemberRole.VIEWER,
		});

		const result = await service.inviteMember(
			searchSpaceId,
			{ email: "existing@example.com", role: MemberRole.EDITOR },
			ownerId,
		);

		expect(result).toEqual({ message: INVITE_SUCCESS_MESSAGE });
		expect(prisma.searchSpaceMember.create).not.toHaveBeenCalled();
	});

	it("should never leak user existence through status codes", async () => {
		const existingUser = {
			id: "user-1",
			email: "exists@example.com",
			fullName: "Exists",
			picture: null,
		};
		prisma.user.findUnique.mockImplementation(({ where }) => {
			if (where.email === "exists@example.com") return Promise.resolve(existingUser);
			return Promise.resolve(null);
		});
		prisma.searchSpaceMember.findUnique.mockResolvedValue(null);
		prisma.searchSpaceMember.create.mockResolvedValue({});

		const resultExisting = await service.inviteMember(
			searchSpaceId,
			{ email: "exists@example.com", role: MemberRole.VIEWER },
			ownerId,
		);

		const resultNonExisting = await service.inviteMember(
			searchSpaceId,
			{ email: "ghost@example.com", role: MemberRole.VIEWER },
			ownerId,
		);

		expect(resultExisting.message).toBe(resultNonExisting.message);
		expect(typeof resultExisting.message).toBe("string");
		expect(typeof resultNonExisting.message).toBe("string");
	});
});
