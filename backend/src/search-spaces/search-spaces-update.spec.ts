import {
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { SearchSpacesService } from "./search-spaces.service";

describe("SearchSpacesService — update", () => {
	let service: SearchSpacesService;
	let prisma: any;
	let permissionsService: any;

	beforeEach(async () => {
		prisma = {
			searchSpace: {
				update: jest.fn(),
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

	const searchSpaceId = 1;
	const ownerId = "owner-user-id";

	const baseMembership: SearchSpaceMembershipAttachment = {
		id: "membership-id",
		role: MemberRole.OWNER,
		searchSpaceId,
		userId: ownerId,
		invitedById: ownerId,
		createdAt: new Date(),
	};

	const mockUpdatedSearchSpace = {
		id: searchSpaceId,
		name: "Updated Name",
		description: "Updated Description",
		headlineImageUrl: null,
		userId: ownerId,
		createdAt: new Date("2024-01-01"),
		pinnedQueryTemplates: [],
	};

	it("should update a search space name and description successfully", async () => {
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description" },
			baseMembership,
		);

		expect(prisma.searchSpace.update).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
			data: {
				name: "Updated Name",
				description: "Updated Description",
				headlineImageUrl: undefined,
			},
			include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
		});

		expect(result).toEqual({
			id: searchSpaceId,
			name: "Updated Name",
			description: "Updated Description",
			headline_image_url: null,
			userId: ownerId,
			pinned_query_template_ids: [],
			created_at: mockUpdatedSearchSpace.createdAt,
			role: MemberRole.OWNER,
			is_owner: true,
		});
	});

	it("should update headlineImageUrl when provided", async () => {
		const updatedWithImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: "https://cdn.example.com/searchspaces/img.png",
		};
		prisma.searchSpace.update.mockResolvedValue(updatedWithImage);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headlineImageUrl: "https://cdn.example.com/searchspaces/img.png" },
			baseMembership,
		);

		expect(prisma.searchSpace.update).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
			data: {
				name: "Updated Name",
				description: "Updated Description",
				headlineImageUrl: "https://cdn.example.com/searchspaces/img.png",
			},
			include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
		});

		expect(result.headline_image_url).toBe("https://cdn.example.com/searchspaces/img.png");
	});

	it("should clear headlineImageUrl when set to null", async () => {
		const clearedImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: null,
		};
		prisma.searchSpace.update.mockResolvedValue(clearedImage);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headlineImageUrl: null },
			baseMembership,
		);

		expect(prisma.searchSpace.update).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
			data: {
				name: "Updated Name",
				description: "Updated Description",
				headlineImageUrl: null,
			},
			include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
		});

		expect(result.headline_image_url).toBeNull();
	});

	it("should update only name when description is not provided", async () => {
		const updatedWithNameOnly = {
			...mockUpdatedSearchSpace,
			name: "New Name Only",
		};
		prisma.searchSpace.update.mockResolvedValue(updatedWithNameOnly);

		const result = await service.update(
			searchSpaceId,
			{ name: "New Name Only" },
			baseMembership,
		);

		expect(prisma.searchSpace.update).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
			data: {
				name: "New Name Only",
				description: undefined,
				headlineImageUrl: undefined,
			},
			include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
		});

		expect(result.name).toBe("New Name Only");
	});

	it("should return is_owner: true when membership role is OWNER", async () => {
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headlineImageUrl: null },
			baseMembership,
		);

		expect(result.is_owner).toBe(true);
		expect(result.role).toBe(MemberRole.OWNER);
	});

	it("should return is_owner: false when membership role is EDITOR", async () => {
		const editorMembership: SearchSpaceMembershipAttachment = {
			...baseMembership,
			role: MemberRole.EDITOR,
		};
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headlineImageUrl: null },
			editorMembership,
		);

		expect(result.is_owner).toBe(false);
		expect(result.role).toBe(MemberRole.EDITOR);
	});

	it("should throw InternalServerErrorException when prisma update fails with non-NotFoundException error", async () => {
		prisma.searchSpace.update.mockRejectedValue(
			new Error("Database connection lost"),
		);

		await expect(
			service.update(
				searchSpaceId,
				{ name: "Updated Name", description: "Updated Description" },
				baseMembership,
			),
		).rejects.toThrow(InternalServerErrorException);
	});

	it("should re-throw NotFoundException from prisma update", async () => {
		prisma.searchSpace.update.mockRejectedValue(
			new NotFoundException("Not found"),
		);

		await expect(
			service.update(
				searchSpaceId,
				{ name: "Updated Name", description: "Updated Description" },
				baseMembership,
			),
		).rejects.toThrow(NotFoundException);
	});

	it("should re-throw ForbiddenException from prisma update", async () => {
		prisma.searchSpace.update.mockRejectedValue(
			new ForbiddenException("Forbidden"),
		);

		await expect(
			service.update(
				searchSpaceId,
				{ name: "Updated Name", description: "Updated Description" },
				baseMembership,
			),
		).rejects.toThrow(ForbiddenException);
	});
});
