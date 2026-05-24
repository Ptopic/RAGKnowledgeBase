import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ConversationMemoryService } from "./conversation-memory.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("ConversationMemoryService", () => {
	let service: ConversationMemoryService;
	let prisma: any;

	const ownerChat = {
		id: 1,
		messages: [],
		searchSpaceId: 10,
		searchSpace: { userId: "owner-1", members: [{ userId: "owner-1" }, { userId: "editor-1" }, { userId: "viewer-1" }] },
	};

	beforeEach(async () => {
		prisma = {
			chat: {
				findFirst: jest.fn(),
				update: jest.fn(),
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ConversationMemoryService,
				{ provide: PrismaService, useValue: prisma },
			],
		}).compile();

		service = module.get<ConversationMemoryService>(ConversationMemoryService);
		jest.clearAllMocks();
	});

	describe("verifyChatOwnership (via getRecentMessages)", () => {
		it("should allow OWNER to access chat", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				...ownerChat,
				searchSpace: { members: { some: { userId: "owner-1" } } },
			});

			const result = await service.getRecentMessages(1, "owner-1", 10);

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 1,
						searchSpace: { members: { some: { userId: "owner-1" } } },
					},
				}),
			);
		});

		it("should allow EDITOR to access chat via membership", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [[{ role: "user", content: "hello" }, { role: "assistant", content: "hi" }]],
				searchSpaceId: 10,
			});

			const result = await service.getRecentMessages(1, "editor-1", 10);

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 1,
						searchSpace: { members: { some: { userId: "editor-1" } } },
					},
				}),
			);
		});

		it("should allow VIEWER to access chat via membership", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [[{ role: "user", content: "hello" }]],
				searchSpaceId: 10,
			});

			const result = await service.getRecentMessages(1, "viewer-1", 10);

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 1,
						searchSpace: { members: { some: { userId: "viewer-1" } } },
					},
				}),
			);
		});

		it("should throw NotFoundException for non-member", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(service.getRecentMessages(1, "non-member", 10)).rejects.toThrow(NotFoundException);
		});
	});

	describe("addMessages (persistence)", () => {
		it("should persist messages for OWNER", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [],
				searchSpaceId: 10,
			});
			prisma.chat.update.mockResolvedValue({ id: 1 });

			await service.addMessages(1, "owner-1", [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there" },
			]);

			expect(prisma.chat.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1 },
					data: { messages: expect.any(Array) },
				}),
			);
		});

		it("should persist messages for EDITOR", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [],
				searchSpaceId: 10,
			});
			prisma.chat.update.mockResolvedValue({ id: 1 });

			await service.addMessages(1, "editor-1", [
				{ role: "user", content: "Editor message" },
				{ role: "assistant", content: "Editor response" },
			]);

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 1,
						searchSpace: { members: { some: { userId: "editor-1" } } },
					},
				}),
			);
			expect(prisma.chat.update).toHaveBeenCalled();
		});

		it("should persist messages for VIEWER", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [],
				searchSpaceId: 10,
			});
			prisma.chat.update.mockResolvedValue({ id: 1 });

			await service.addMessages(1, "viewer-1", [
				{ role: "user", content: "Viewer message" },
				{ role: "assistant", content: "Viewer response" },
			]);

			expect(prisma.chat.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 1,
						searchSpace: { members: { some: { userId: "viewer-1" } } },
					},
				}),
			);
			expect(prisma.chat.update).toHaveBeenCalled();
		});

		it("should NOT persist messages for non-member", async () => {
			prisma.chat.findFirst.mockResolvedValue(null);

			await expect(
				service.addMessages(1, "non-member", [
					{ role: "user", content: "Intruder" },
				]),
			).rejects.toThrow(NotFoundException);

			expect(prisma.chat.update).not.toHaveBeenCalled();
		});

		it("should append messages to existing exchanges", async () => {
			const existingMessages = [
				[{ role: "user", content: "first" }, { role: "assistant", content: "first-response" }],
			];
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: existingMessages,
				searchSpaceId: 10,
			});
			prisma.chat.update.mockResolvedValue({ id: 1 });

			await service.addMessages(1, "viewer-1", [
				{ role: "user", content: "second" },
				{ role: "assistant", content: "second-response" },
			]);

			const updateCall = prisma.chat.update.mock.calls[0][0];
			const persisted = updateCall.data.messages;
			expect(persisted).toHaveLength(2);
			expect(persisted[1]).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ role: "user", content: "second" }),
					expect.objectContaining({ role: "assistant", content: "second-response" }),
				]),
			);
		});
	});

	describe("getRecentMessages (conversation context)", () => {
		it("should return messages for VIEWER member", async () => {
			prisma.chat.findFirst.mockResolvedValue({
				id: 1,
				messages: [
					[{ role: "user", content: "hello" }, { role: "assistant", content: "world" }],
				],
				searchSpaceId: 10,
			});

			const result = await service.getRecentMessages(1, "viewer-1", 10);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ role: "user", content: "hello" });
		});

		it("should return empty array gracefully on non-NotFoundException errors", async () => {
			prisma.chat.findFirst.mockRejectedValue(new Error("DB connection lost"));

			const result = await service.getRecentMessages(1, "viewer-1", 10);

			expect(result).toEqual([]);
		});
	});
});
