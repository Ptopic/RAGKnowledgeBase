import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { ResearcherService } from './researcher.service';
import { StreamingService } from './streaming.service';

@Module({
  providers: [AgentService, ResearcherService, StreamingService],
  controllers: [AgentController]
})
export class AgentModule {}
