import { Module } from '@nestjs/common';
import { QueryTemplatesController } from './query-templates.controller';
import { QueryTemplatesService } from './query-templates.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [QueryTemplatesController],
  providers: [QueryTemplatesService, PrismaService],
  exports: [QueryTemplatesService],
})
export class QueryTemplatesModule {}
