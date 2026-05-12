import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChatsModule } from "../chats/chats.module";
import { ChatShareController } from "./chat-share.controller";
import { ChatShareService } from "./chat-share.service";

@Module({
	imports: [ChatsModule],
	controllers: [ChatShareController],
	providers: [ChatShareService, PrismaService],
	exports: [ChatShareService],
})
export class ChatShareModule {}
