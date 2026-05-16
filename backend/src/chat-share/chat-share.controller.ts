import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { ChatShareService } from "./chat-share.service";
import { CreateShareLinkDto } from "./dtos/share-link.dto";

@Controller()
export class ChatShareController {
	constructor(private readonly chatShareService: ChatShareService) {}

	@Post("chats/:id/share")
	@UseGuards(JwtAuthGuard)
	async createShareLink(
		@Param("id", ParseIntPipe) id: number,
		@Body() createDto: CreateShareLinkDto,
		@Req() req: any,
	) {
		return this.chatShareService.createShareLink(id, req.user.id, createDto);
	}

	@Get("chats/:id/share")
	@UseGuards(JwtAuthGuard)
	async getChatShareLinks(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	) {
		return this.chatShareService.getChatShareLinks(id, req.user.id);
	}

	@Delete("chats/:id/share")
	@UseGuards(JwtAuthGuard)
	async deactivateAllLinks(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	) {
		return this.chatShareService.deactivateAllLinks(id, req.user.id);
	}

	@Delete("chats/:id/share/:linkId")
	@UseGuards(JwtAuthGuard)
	async deactivateLink(
		@Param("id", ParseIntPipe) id: number,
		@Param("linkId") linkId: string,
		@Req() req: any,
	) {
		return this.chatShareService.deactivateLink(id, linkId, req.user.id);
	}

	@Get("s/:slug")
	async getSharedChat(@Param("slug") slug: string) {
		return this.chatShareService.getSharedChat(slug);
	}
}
