import { forwardRef, Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { ResearcherService } from './researcher.service';
import { StreamingService } from './streaming.service';
import { ConnectorService } from './services/connector.service';
import { QNAService } from './services/qna.service';
import { LLMService } from './services/llm.service';
import { RerankerService } from './services/reranker.service';
import { PromptsService } from './services/prompts.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RetrieverModule } from 'src/retriever/retriever.module';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [PrismaModule, RetrieverModule, forwardRef(() => TasksModule)],
  providers: [
    AgentService,
    ResearcherService,
    StreamingService,
    ConnectorService,
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
    QNAService,
    LLMService,
    RerankerService,
    PromptsService,
  ],
})
export class AgentModule {}
