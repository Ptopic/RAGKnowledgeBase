import { Module } from '@nestjs/common';
import { LLMConfigsController } from './llm-configs.controller';
import { LLMConfigsService } from './llm-configs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [ApiKeysModule, PermissionsModule],
  controllers: [LLMConfigsController],
  providers: [LLMConfigsService, PrismaService],
  exports: [LLMConfigsService],
})
export class LLMConfigsModule {}
