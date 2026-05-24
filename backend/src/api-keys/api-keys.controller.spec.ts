import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { PermissionsService } from "../permissions/permissions.service";

describe("ApiKeysController", () => {
  let controller: ApiKeysController;
  let apiKeysService: any;
  let permissionsService: any;

  beforeEach(async () => {
    apiKeysService = {
      upsert: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    permissionsService = {
      getSearchSpacesForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        { provide: ApiKeysService, useValue: apiKeysService },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /settings/api-keys", () => {
    it("should allow any authenticated user to list their keys", async () => {
      apiKeysService.findAll.mockResolvedValue([]);
      await controller.findAll({ user: { id: "user-1" } });
      expect(apiKeysService.findAll).toHaveBeenCalledWith("user-1");
    });
  });

  describe("GET /settings/api-keys/:id", () => {
    it("should allow any authenticated user to get a key", async () => {
      apiKeysService.findOne.mockResolvedValue({ id: "key-1" });
      await controller.findOne("key-1", { user: { id: "user-1" } });
      expect(apiKeysService.findOne).toHaveBeenCalledWith("key-1", "user-1");
    });
  });

  describe("POST /settings/api-keys (upsert)", () => {
    it("should allow OWNER to upsert a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: true },
      ]);
      apiKeysService.upsert.mockResolvedValue({ id: "key-1" });

      const dto = { provider: "OPENAI", api_key: "sk-test", name: "OpenAI Key" } as any;
      await controller.upsert(dto, { user: { id: "user-1" } });

      expect(apiKeysService.upsert).toHaveBeenCalledWith("user-1", dto);
    });

    it("should deny non-OWNER from upserting a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: false, role: "VIEWER" },
      ]);

      const dto = { provider: "OPENAI", api_key: "sk-test", name: "OpenAI Key" } as any;
      await expect(controller.upsert(dto, { user: { id: "user-1" } })).rejects.toThrow(ForbiddenException);
      expect(apiKeysService.upsert).not.toHaveBeenCalled();
    });

    it("should deny user with no search spaces from upserting a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([]);

      const dto = { provider: "OPENAI", api_key: "sk-test", name: "OpenAI Key" } as any;
      await expect(controller.upsert(dto, { user: { id: "user-1" } })).rejects.toThrow(ForbiddenException);
    });
  });

  describe("PUT /settings/api-keys/:id (update)", () => {
    it("should allow OWNER to update a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: true },
      ]);
      apiKeysService.update.mockResolvedValue({ id: "key-1" });

      const dto = { name: "Updated Key" } as any;
      await controller.update("key-1", dto, { user: { id: "user-1" } });

      expect(apiKeysService.update).toHaveBeenCalledWith("key-1", "user-1", dto);
    });

    it("should deny non-OWNER from updating a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: false, role: "EDITOR" },
      ]);

      const dto = { name: "Updated Key" } as any;
      await expect(controller.update("key-1", dto, { user: { id: "user-1" } })).rejects.toThrow(ForbiddenException);
    });
  });

  describe("DELETE /settings/api-keys/:id (remove)", () => {
    it("should allow OWNER to delete a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: true },
      ]);
      apiKeysService.remove.mockResolvedValue({ message: "Deleted" });

      await controller.remove("key-1", { user: { id: "user-1" } });

      expect(apiKeysService.remove).toHaveBeenCalledWith("key-1", "user-1");
    });

    it("should deny non-OWNER from deleting a key", async () => {
      permissionsService.getSearchSpacesForUser.mockResolvedValue([
        { id: 1, name: "Space 1", is_owner: false, role: "VIEWER" },
      ]);

      await expect(controller.remove("key-1", { user: { id: "user-1" } })).rejects.toThrow(ForbiddenException);
    });
  });
});
