import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { MemberRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { ChatsService } from "./chats.service";
import {
	ChatDto,
	ChatWithoutMessagesDto,
	CreateChatDto,
	FavoriteChatResponseDto,
	ToggleFavoriteDto,
	UpdateChatDto,
} from "./dtos/chat.dto";

@Controller()
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class ChatsController {
	constructor(private readonly chatsService: ChatsService) {}

	@Post("chats")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async create(
		@Body() createDto: CreateChatDto,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.create(
			createDto,
			req.user.id,
			req.searchSpaceMembership,
		);
	}

	@Get("chats")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<ChatWithoutMessagesDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.chatsService.findAll(
			req.user.id,
			skipNum,
			limitNum,
			req.searchSpaceContext.searchSpaceId,
		);
	}

	@Get("chats/:id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.findOne(id, req.user.id);
	}

	@Put("chats/:id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateChatDto,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.update(id, updateDto, req.user.id);
	}

	@Delete("chats/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.chatsService.remove(id, req.user.id);
	}

	@Post("chats/:id/favorite")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async addFavorite(
		@Param("id", ParseIntPipe) id: number,
		@Body() _toggleDto: ToggleFavoriteDto,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.addFavorite(id, req.user.id);
	}

	@Delete("chats/:id/favorite")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async removeFavorite(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<FavoriteChatResponseDto> {
		return this.chatsService.removeFavorite(id, req.user.id);
	}

	@Get("chats/favorites")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findFavorites(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<ChatDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.chatsService.findFavorites(
			req.user.id,
			skipNum,
			limitNum,
			req.searchSpaceContext.searchSpaceId,
		);
	}
}
