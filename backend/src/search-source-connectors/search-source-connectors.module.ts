import { Module } from '@nestjs/common';
import { SearchSourceConnectorsController } from './search-source-connectors.controller';
import { SearchSourceConnectorsService } from './search-source-connectors.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SearchSourceConnectorsController],
  providers: [SearchSourceConnectorsService, PrismaService],
  exports: [SearchSourceConnectorsService],
})
export class SearchSourceConnectorsModule {}
