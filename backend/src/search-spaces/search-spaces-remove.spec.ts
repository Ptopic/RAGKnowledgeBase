import {
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { UploadService } from "../upload";
import { SearchSpacesService } from "./search-spaces.service";

describe("SearchSpacesService — remove", () => {
	let service: SearchSpacesService;
	let prisma: any;
	let permissionsService: any;
	let uploadService: any;

	beforeEach(async () => {
		prisma = {
			searchSpace: {
				delete: jest.fn().mockResolvedValue({ id: 1 }),
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
	const userId = "user-id";

	it("should delete search space without headline image", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue({
			id: searchSpaceId,
			headlineImageUrl: null,
		});

		const result = await service.remove(searchSpaceId, userId);

		expect(uploadService.delete).not.toHaveBeenCalled();
		expect(prisma.searchSpace.delete).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
		});
		expect(result.message).toBe("Search space deleted successfully");
	});

	it("should delete headline image from S3 when search space has one", async () => {
		const imageUrl = "https://cdn.example.com/searchspaces/img.png";
		prisma.searchSpace.findFirst.mockResolvedValue({
			id: searchSpaceId,
			headlineImageUrl: imageUrl,
		});

		const result = await service.remove(searchSpaceId, userId);

		expect(uploadService.delete).toHaveBeenCalledWith(imageUrl);
		expect(prisma.searchSpace.delete).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
		});
		expect(result.message).toBe("Search space deleted successfully");
	});

	it("should still delete search space even if image deletion fails", async () => {
		const imageUrl = "https://cdn.example.com/searchspaces/img.png";
		prisma.searchSpace.findFirst.mockResolvedValue({
			id: searchSpaceId,
			headlineImageUrl: imageUrl,
		});
		uploadService.delete.mockRejectedValue(new Error("S3 error"));

		const result = await service.remove(searchSpaceId, userId);

		expect(uploadService.delete).toHaveBeenCalledWith(imageUrl);
		expect(prisma.searchSpace.delete).toHaveBeenCalledWith({
			where: { id: searchSpaceId },
		});
		expect(result.message).toBe("Search space deleted successfully");
	});

	it("should throw NotFoundException when search space does not exist", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue(null);

		await expect(
			service.remove(searchSpaceId, userId),
		).rejects.toThrow(NotFoundException);

		expect(prisma.searchSpace.delete).not.toHaveBeenCalled();
		expect(uploadService.delete).not.toHaveBeenCalled();
	});

	it("should throw InternalServerErrorException when prisma delete fails", async () => {
		prisma.searchSpace.findFirst.mockResolvedValue({
			id: searchSpaceId,
			headlineImageUrl: null,
		});
		prisma.searchSpace.delete.mockRejectedValue(
			new Error("Database connection lost"),
		);

		await expect(
			service.remove(searchSpaceId, userId),
		).rejects.toThrow(InternalServerErrorException);
	});
});
