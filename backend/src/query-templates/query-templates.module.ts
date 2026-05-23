import { Module } from '@nestjs/common';
import { QueryTemplatesController } from './query-templates.controller';
import { QueryTemplatesService } from './query-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [QueryTemplatesController],
  providers: [QueryTemplatesService, PrismaService],
  exports: [QueryTemplatesService],
})
export class QueryTemplatesModule {}
