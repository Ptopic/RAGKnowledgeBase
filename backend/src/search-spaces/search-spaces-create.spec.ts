import {
	BadRequestException,
	InternalServerErrorException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MemberRole } from "@prisma/client";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload";
import { SearchSpacesService } from "./search-spaces.service";

describe("SearchSpacesService — create", () => {
	let service: SearchSpacesService;
	let prisma: any;
	let permissionsService: any;
	let uploadService: any;

	beforeEach(async () => {
		prisma = {
			searchSpace: {
				create: jest.fn(),
			},
			searchSpaceMember: {
				create: jest.fn(),
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

	const userId = "user-id";

	const createdSearchSpace = {
		id: 1,
		name: "Test Space",
		description: "A test space",
		headlineImageUrl: null,
		userId,
		createdAt: new Date("2024-01-01"),
	};

	const createdMember = {
		id: "membership-id",
		searchSpaceId: 1,
		userId,
		role: MemberRole.OWNER,
		invitedById: userId,
		createdAt: new Date(),
	};

	it("should create a search space without headline image", async () => {
		prisma.searchSpace.create.mockResolvedValue(createdSearchSpace);
		prisma.searchSpaceMember.create.mockResolvedValue(createdMember);

		const result = await service.create(
			{ name: "Test Space", description: "A test space" },
			userId,
		);

		expect(prisma.searchSpace.create).toHaveBeenCalledWith({
			data: {
				name: "Test Space",
				description: "A test space",
				headlineImageUrl: undefined,
				userId,
			},
		});
		expect(result.headline_image_url).toBeNull();
		expect(result.is_owner).toBe(true);
	});

	it("should create a search space with a headline image URL", async () => {
		const imageUrl = "https://cdn.example.com/searchspaces/img.png";
		const withImage = { ...createdSearchSpace, headlineImageUrl: imageUrl };
		prisma.searchSpace.create.mockResolvedValue(withImage);
		prisma.searchSpaceMember.create.mockResolvedValue(createdMember);

		const result = await service.create(
			{ name: "Test Space", description: "A test space", headlineImageUrl: imageUrl },
			userId,
		);

		expect(prisma.searchSpace.create).toHaveBeenCalledWith({
			data: {
				name: "Test Space",
				description: "A test space",
				headlineImageUrl: imageUrl,
				userId,
			},
		});
		expect(result.headline_image_url).toBe(imageUrl);
		expect(uploadService.isOwnedUrl).toHaveBeenCalledWith(imageUrl);
	});

	it("should reject headlineImageUrl pointing to external storage", async () => {
		uploadService.isOwnedUrl.mockReturnValue(false);

		await expect(
			service.create(
				{ name: "Test Space", description: "A test space", headlineImageUrl: "https://evil.com/img.png" },
				userId,
			),
		).rejects.toThrow(BadRequestException);

		expect(uploadService.isOwnedUrl).toHaveBeenCalledWith("https://evil.com/img.png");
		expect(prisma.searchSpace.create).not.toHaveBeenCalled();
	});

	it("should allow creating with headlineImageUrl set to null", async () => {
		prisma.searchSpace.create.mockResolvedValue(createdSearchSpace);
		prisma.searchSpaceMember.create.mockResolvedValue(createdMember);

		const result = await service.create(
			{ name: "Test Space", description: "A test space", headlineImageUrl: null },
			userId,
		);

		expect(prisma.searchSpace.create).toHaveBeenCalledWith({
			data: {
				name: "Test Space",
				description: "A test space",
				headlineImageUrl: null,
				userId,
			},
		});
		expect(result.headline_image_url).toBeNull();
		// isOwnedUrl should NOT be called for null
		expect(uploadService.isOwnedUrl).not.toHaveBeenCalled();
	});

	it("should create OWNER membership after search space creation", async () => {
		prisma.searchSpace.create.mockResolvedValue(createdSearchSpace);
		prisma.searchSpaceMember.create.mockResolvedValue(createdMember);

		await service.create(
			{ name: "Test Space", description: "A test space" },
			userId,
		);

		expect(prisma.searchSpaceMember.create).toHaveBeenCalledWith({
			data: {
				searchSpaceId: 1,
				userId,
				role: MemberRole.OWNER,
				invitedById: userId,
			},
		});
	});

	it("should throw InternalServerErrorException when prisma create fails", async () => {
		prisma.searchSpace.create.mockRejectedValue(
			new Error("Database connection lost"),
		);

		await expect(
			service.create(
				{ name: "Test Space", description: "A test space" },
				userId,
			),
		).rejects.toThrow(InternalServerErrorException);
	});
});
