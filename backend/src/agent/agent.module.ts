import { forwardRef, Module } from "@nestjs/common";
import { ChatsModule } from "src/chats/chats.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { RetrieverModule } from "src/retriever/retriever.module";
import { TasksModule } from "src/tasks/tasks.module";
import { ApiKeysModule } from "src/api-keys/api-keys.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { ResearcherService } from "./researcher.service";
import { LLMService, PromptsService, QNAService } from "./services";
import { ChatActionsService } from "./services/chat-actions.service";
import { ConnectorService } from "./services/connector.service";
import { ConversationMemoryService } from "./services/conversation-memory.service";
import { DeepAgentService } from "./services/deep-agent.service";
import { StreamingService } from "./streaming.service";
import { RerankerService } from "./services/reranker.service";
import { CheckpointerModule } from "./checkpointer/checkpointer.module";

@Module({
	imports: [
		PrismaModule,
		RetrieverModule,
		ApiKeysModule,
		forwardRef(() => TasksModule),
		forwardRef(() => ChatsModule),
		CheckpointerModule,
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
