import { forwardRef, Module } from "@nestjs/common";
import { ChatsModule } from "src/chats/chats.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { RetrieverModule } from "src/retriever/retriever.module";
import { TasksModule } from "src/tasks/tasks.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { ResearcherService } from "./researcher.service";
import { ConnectorService } from "./services/connector.service";
import { ConversationMemoryService } from "./services/conversation-memory.service";
import { LLMService } from "./services/llm.service";
import { PromptsService } from "./services/prompts.service";
import { QNAService } from "./services/qna.service";
import { RerankerService } from "./services/reranker.service";
import { StreamingService } from "./streaming.service";

@Module({
	imports: [
		PrismaModule,
		RetrieverModule,
		forwardRef(() => TasksModule),
		forwardRef(() => ChatsModule),
	],
	providers: [
		AgentService,
		ResearcherService,
		StreamingService,
		ConnectorService,
		ConversationMemoryService,
		QNAService,
		LLMService,
		RerankerService,
		PromptsService,
	],
	controllers: [AgentController],
	exports: [
		AgentService,
		ResearcherService,
		ConnectorService,
		ConversationMemoryService,
		QNAService,
		LLMService,
		RerankerService,
		PromptsService,
	],
})
export class AgentModule {}
