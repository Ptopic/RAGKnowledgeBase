import { Module } from '@nestjs/common';
import { LLMConfigsController } from './llm-configs.controller';
import { LLMConfigsService } from './llm-configs.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LLMConfigsController],
  providers: [LLMConfigsService, PrismaService],
  exports: [LLMConfigsService],
})
export class LLMConfigsModule {}
