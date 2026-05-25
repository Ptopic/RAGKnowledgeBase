import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PermissionsService } from "../permissions/permissions.service";
import { UploadService } from "../upload";
import { SearchSpacesController } from "./search-spaces.controller";
import { SearchSpacesService } from "./search-spaces.service";

describe("SearchSpacesController — deleteImage", () => {
	let controller: SearchSpacesController;
	let uploadService: any;
	let searchSpacesService: any;
	let permissionsService: any;

	beforeEach(async () => {
		searchSpacesService = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			inviteMember: jest.fn(),
			listMembers: jest.fn(),
			updateMemberRole: jest.fn(),
			removeMember: jest.fn(),
			leaveSearchSpace: jest.fn(),
		};

		permissionsService = {
			getMembership: jest.fn(),
			getSearchSpacesForUser: jest.fn(),
			getAccessibleSearchSpaceIds: jest.fn(),
		};

		uploadService = {
			upload: jest.fn(),
			delete: jest.fn().mockResolvedValue(undefined),
			isOwnedUrl: jest.fn().mockReturnValue(true),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SearchSpacesController],
			providers: [
				{ provide: SearchSpacesService, useValue: searchSpacesService },
				{ provide: PermissionsService, useValue: permissionsService },
				{ provide: UploadService, useValue: uploadService },
			],
		}).compile();

		controller = module.get<SearchSpacesController>(SearchSpacesController);
	});

	it("should delete image when URL is owned by application storage", async () => {
		const url = "https://cdn.example.com/searchspaces/img.png";
		uploadService.isOwnedUrl.mockReturnValue(true);

		const result = await controller.deleteImage({ url }, {} as any);

		expect(uploadService.isOwnedUrl).toHaveBeenCalledWith(url);
		expect(uploadService.delete).toHaveBeenCalledWith(url);
		expect(result.message).toBe("Image deleted");
	});

	it("should reject deletion when URL is not owned by application storage", async () => {
		const url = "https://evil.com/img.png";
		uploadService.isOwnedUrl.mockReturnValue(false);

		await expect(
			controller.deleteImage({ url }, {} as any),
		).rejects.toThrow(BadRequestException);

		expect(uploadService.isOwnedUrl).toHaveBeenCalledWith(url);
		expect(uploadService.delete).not.toHaveBeenCalled();
	});
});
