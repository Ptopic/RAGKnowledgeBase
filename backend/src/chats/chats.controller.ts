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
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { ChatsService } from "./chats.service";
import {
	ChatDto,
	ChatWithoutMessagesDto,
	CreateChatDto,
	UpdateChatDto,
} from "./dtos/chat.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatsController {
	constructor(private readonly chatsService: ChatsService) {}

	@Post("chats")
	async create(
		@Body() createDto: CreateChatDto,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.create(createDto, req.user.id);
	}

	@Get("chats")
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("search_space_id") searchSpaceId?: string,
	): Promise<ChatWithoutMessagesDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		const searchSpaceIdNum =
			searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;
		return this.chatsService.findAll(
			req.user.id,
			skipNum,
			limitNum,
			searchSpaceIdNum,
		);
	}

	@Get("chats/:id")
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.findOne(id, req.user.id);
	}

	@Put("chats/:id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateChatDto,
		@Req() req: any,
	): Promise<ChatDto> {
		return this.chatsService.update(id, updateDto, req.user.id);
	}

	@Delete("chats/:id")
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.chatsService.remove(id, req.user.id);
	}
}
