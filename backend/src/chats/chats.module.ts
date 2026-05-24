import { forwardRef, Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { PrismaService } from "../prisma/prisma.service";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
	imports: [forwardRef(() => AgentModule), PermissionsModule],
	controllers: [ChatsController],
	providers: [ChatsService, PrismaService],
	exports: [ChatsService],
})
export class ChatsModule {}
