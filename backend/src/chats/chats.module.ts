import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { PrismaService } from "../prisma/prisma.service";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";

@Module({
	imports: [AgentModule],
	controllers: [ChatsController],
	providers: [ChatsService, PrismaService],
	exports: [ChatsService],
})
export class ChatsModule {}
