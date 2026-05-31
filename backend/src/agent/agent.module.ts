import { forwardRef, Module } from "@nestjs/common";
import { ApiKeysModule } from "src/api-keys/api-keys.module";
import { ChatsModule } from "src/chats/chats.module";
import { DocumentsModule } from "src/documents/documents.module";
import { PermissionsModule } from "src/permissions/permissions.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { QueueModule } from "src/queue/queue.module";
import { RetrieverModule } from "src/retriever/retriever.module";
import { TasksModule } from "src/tasks/tasks.module";
import { UploadModule } from "src/upload/upload.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { CheckpointerModule } from "./checkpointer/checkpointer.module";
import { ResearcherService } from "./researcher.service";
import { LLMService, PromptsService, QNAService } from "./services";
import { ChatActionsService } from "./services/chat-actions.service";
import { ConnectorService } from "./services/connector.service";
import { ConversationMemoryService } from "./services/conversation-memory.service";
import { DeepAgentService } from "./services/deep-agent.service";
import { RerankerService } from "./services/reranker.service";
import { StreamingService } from "./streaming.service";

@Module({
	imports: [
		PrismaModule,
		PermissionsModule,
		RetrieverModule,
		ApiKeysModule,
		forwardRef(() => TasksModule),
		forwardRef(() => ChatsModule),
		forwardRef(() => QueueModule),
		forwardRef(() => DocumentsModule),
		CheckpointerModule,
		UploadModule,
		SubscriptionModule,
	],
	providers: [
		AgentService,
		ChatActionsService,
		DeepAgentService,
		ResearcherService,
		LLMService,
		QNAService,
		PromptsService,
		RerankerService,
		StreamingService,
		ConnectorService,
		ConversationMemoryService,
	],
	controllers: [AgentController],
	exports: [
		AgentService,
		ResearcherService,
		ConnectorService,
		ConversationMemoryService,
		DeepAgentService,
		QNAService,
		LLMService,
		RerankerService,
		PromptsService,
	],
})
export class AgentModule {}
