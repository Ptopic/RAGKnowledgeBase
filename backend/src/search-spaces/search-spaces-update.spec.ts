import {
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload";
import { SearchSpacesService } from "./search-spaces.service";

describe("SearchSpacesService — update", () => {
	let service: SearchSpacesService;
	let prisma: any;
	let permissionsService: any;
	let uploadService: any;

	beforeEach(async () => {
		prisma = {
			searchSpace: {
				update: jest.fn(),
				findFirst: jest.fn(),
			},
		};

		permissionsService = {
			getMembership: jest.fn(),
			getSearchSpacesForUser: jest.fn(),
			getAccessibleSearchSpaceIds: jest.fn(),
		};

		uploadService = {
			delete: jest.fn().mockResolvedValue(undefined),
			isOwnedUrl: jest.fn().mockReturnValue(true),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SearchSpacesService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: PermissionsService, useValue: permissionsService },
				{ provide: UploadService, useValue: uploadService },
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

	const existingSearchSpace = {
		id: searchSpaceId,
		name: "Original Name",
		description: "Original Description",
		headlineImageUrl: null,
		userId: ownerId,
		createdAt: new Date("2024-01-01"),
		pinnedQueryTemplates: [],
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
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
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

	it("should update headline_image_url when provided", async () => {
		const newImageUrl = "https://cdn.example.com/searchspaces/img.png";
		const existingNoImage = { ...existingSearchSpace, headlineImageUrl: null };
		prisma.searchSpace.findFirst.mockResolvedValue(existingNoImage);

		const updatedWithImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: newImageUrl,
		};
		prisma.searchSpace.update.mockResolvedValue(updatedWithImage);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: newImageUrl },
			baseMembership,
		);

		expect(prisma.searchSpace.update).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
			data: {
				name: "Updated Name",
				description: "Updated Description",
				headlineImageUrl: newImageUrl,
			},
			include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
		});

		expect(result.headline_image_url).toBe(newImageUrl);
		expect(uploadService.delete).not.toHaveBeenCalled();
	});

	it("should delete old headline image from S3 when replacing with a new one", async () => {
		const oldImageUrl = "https://cdn.example.com/searchspaces/old-img.png";
		const newImageUrl = "https://cdn.example.com/searchspaces/new-img.png";
		const existingWithImage = { ...existingSearchSpace, headlineImageUrl: oldImageUrl };
		prisma.searchSpace.findFirst.mockResolvedValue(existingWithImage);

		const updatedWithNewImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: newImageUrl,
		};
		prisma.searchSpace.update.mockResolvedValue(updatedWithNewImage);

		await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: newImageUrl },
			baseMembership,
		);

		expect(uploadService.delete).toHaveBeenCalledWith(oldImageUrl);
	});

	it("should delete old headline image from S3 when removing (setting to null)", async () => {
		const oldImageUrl = "https://cdn.example.com/searchspaces/old-img.png";
		const existingWithImage = { ...existingSearchSpace, headlineImageUrl: oldImageUrl };
		prisma.searchSpace.findFirst.mockResolvedValue(existingWithImage);

		const clearedImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: null,
		};
		prisma.searchSpace.update.mockResolvedValue(clearedImage);

		await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: null },
			baseMembership,
		);

		expect(uploadService.delete).toHaveBeenCalledWith(oldImageUrl);
	});

	it("should not delete old headline image when headline_image_url is not changed", async () => {
		const imageUrl = "https://cdn.example.com/searchspaces/img.png";
		const existingWithImage = { ...existingSearchSpace, headlineImageUrl: imageUrl };
		prisma.searchSpace.findFirst.mockResolvedValue(existingWithImage);

		const updatedSameImage = {
			...mockUpdatedSearchSpace,
			headlineImageUrl: imageUrl,
		};
		prisma.searchSpace.update.mockResolvedValue(updatedSameImage);

		await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: imageUrl },
			baseMembership,
		);

		expect(uploadService.delete).not.toHaveBeenCalled();
	});

	it("should reject headline_image_url pointing to external storage", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
		uploadService.isOwnedUrl.mockReturnValue(false);

		await expect(
			service.update(
				searchSpaceId,
				{ name: "Updated Name", description: "Updated Description", headline_image_url: "https://evil.com/img.png" },
				baseMembership,
			),
		).rejects.toThrow(BadRequestException);

		expect(uploadService.isOwnedUrl).toHaveBeenCalledWith("https://evil.com/img.png");
	});

	it("should not delete anything when updating without changing the image and existing has none", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: null },
			baseMembership,
		);

		expect(uploadService.delete).not.toHaveBeenCalled();
	});

	it("should throw NotFoundException when search space does not exist", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(null);

		await expect(
			service.update(
				searchSpaceId,
				{ name: "Updated Name", description: "Updated Description" },
				baseMembership,
			),
		).rejects.toThrow(NotFoundException);
	});

	it("should update only name when description is not provided", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
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
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: null },
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
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
		prisma.searchSpace.update.mockResolvedValue(mockUpdatedSearchSpace);

		const result = await service.update(
			searchSpaceId,
			{ name: "Updated Name", description: "Updated Description", headline_image_url: null },
			editorMembership,
		);

		expect(result.is_owner).toBe(false);
		expect(result.role).toBe(MemberRole.EDITOR);
	});

	it("should throw InternalServerErrorException when prisma update fails with non-NotFoundException error", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
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
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
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
		prisma.searchSpace.findFirst.mockResolvedValue(existingSearchSpace);
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
