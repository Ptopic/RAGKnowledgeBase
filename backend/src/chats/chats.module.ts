import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';
import { StreamConnectorSearchResultsService } from '../tasks/stream-connector-search-results.service';

@Module({
  controllers: [ChatsController],
  providers: [
    ChatsService,
    PrismaService,
    StreamConnectorSearchResultsService,
  ],
  exports: [ChatsService],
})
export class ChatsModule {}
