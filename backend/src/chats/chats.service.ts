import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../permissions/permissions.service";
import { SearchSpaceMembershipAttachment } from "../permissions/guards/search-space-access.guard";
import {
	ChatDto,
	ChatWithoutMessagesDto,
	CreateChatDto,
	UpdateChatDto,
} from "./dtos/chat.dto";

@Injectable()
export class ChatsService {
	constructor(
		private prisma: PrismaService,
		private permissionsService: PermissionsService,
	) {}

	async create(
		createDto: CreateChatDto,
		userId: string,
		membership?: SearchSpaceMembershipAttachment,
	): Promise<ChatDto> {
		try {
		// Authorization: guard-provided membership skips DB lookup for HTTP callers;
		// non-HTTP callers (AgentService, DeepAgentService) omit membership, requiring explicit check
		if (!membership) {
			await this.permissionsService.requireRead(createDto.search_space_id, userId);
		}

			const chat = await this.prisma.chat.create({
				data: {
					type: createDto.type,
					title: createDto.title,
					initialConnectors: createDto.initial_connectors || [],
					messages: createDto.messages as unknown as Prisma.InputJsonValue,
					searchSpaceId: createDto.search_space_id,
				},
			});

			return this.toDto(chat);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create chat: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 100,
		searchSpaceId: number,
	): Promise<ChatWithoutMessagesDto[]> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			const chats = await this.prisma.chat.findMany({
				where: { searchSpaceId },
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					favorites: {
						where: { userId },
						select: { id: true },
						take: 1,
					},
				},
			});

			return chats.map((chat) => this.toWithoutMessagesDto(chat));
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch chats: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<ChatDto> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id },
			});

			if (!chat) {
				throw new NotFoundException(
					"Chat not found or you do not have permission to access it",
				);
			}

			return this.toDto(chat);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch chat: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateChatDto,
		userId: string,
	): Promise<ChatDto> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id },
			});

			if (!chat) {
				throw new NotFoundException(
					"Chat not found or you do not have permission to access it",
				);
			}

			const updated = await this.prisma.chat.update({
				where: { id },
				data: {
					type: updateDto.type,
					title: updateDto.title,
					initialConnectors: updateDto.initial_connectors,
					messages: updateDto.messages as unknown as Prisma.InputJsonValue,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update chat: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id },
			});

			if (!chat) {
				throw new NotFoundException(
					"Chat not found or you do not have permission to access it",
				);
			}

			await this.prisma.chat.delete({
				where: { id },
			});

			return { message: "Chat deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete chat: ${error.message}`,
			);
		}
	}

	async addFavorite(chatId: number, userId: string): Promise<ChatDto> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId },
			});

			if (!chat) {
				throw new NotFoundException(
					"Chat not found or you do not have permission to access it",
				);
			}

			await this.prisma.userChatFavorite.create({
				data: {
					userId,
					chatId,
				},
			});

			return this.toDto(chat);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			if (error.code === "P2002") {
				throw new ConflictException("Chat is already favorited");
			}
			throw new InternalServerErrorException(
				`Failed to add favorite: ${error.message}`,
			);
		}
	}

	async removeFavorite(
		chatId: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			const chat = await this.prisma.chat.findFirst({
				where: { id: chatId },
			});

			if (!chat) {
				throw new NotFoundException(
					"Chat not found or you do not have permission to access it",
				);
			}

			await this.prisma.userChatFavorite.deleteMany({
				where: {
					userId,
					chatId,
				},
			});

			return { message: "Favorite removed successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to remove favorite: ${error.message}`,
			);
		}
	}

	async findFavorites(
		userId: string,
		skip: number = 0,
		limit: number = 100,
		searchSpaceId: number,
	): Promise<ChatDto[]> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			const favorites = await this.prisma.userChatFavorite.findMany({
				where: {
					userId,
					chat: { searchSpaceId },
				},
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					chat: true,
				},
			});

			return favorites.map((fav) => ({ ...this.toDto(fav.chat), is_favorite: true }));
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch favorites: ${error.message}`,
			);
		}
	}

	private toDto(chat: any): ChatDto {
		return {
			id: chat.id,
			type: chat.type,
			title: chat.title,
			initial_connectors: chat.initialConnectors || [],
			messages: chat.messages,
			search_space_id: chat.searchSpaceId,
			is_favorite: Array.isArray(chat.favorites)
				? chat.favorites.length > 0
				: undefined,
			created_at: chat.createdAt,
		};
	}

	private toWithoutMessagesDto(chat: any): ChatWithoutMessagesDto {
		return {
			id: chat.id,
			type: chat.type,
			title: chat.title,
			initial_connectors: chat.initialConnectors || [],
			search_space_id: chat.searchSpaceId,
			is_favorite: Array.isArray(chat.favorites)
				? chat.favorites.length > 0
				: undefined,
			created_at: chat.createdAt,
		};
	}
}
