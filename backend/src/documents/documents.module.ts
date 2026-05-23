import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueModule } from '../queue/queue.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [QueueModule, PermissionsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
