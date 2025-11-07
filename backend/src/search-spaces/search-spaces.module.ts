import { Module } from '@nestjs/common';
import { SearchSpacesController } from './search-spaces.controller';
import { SearchSpacesService } from './search-spaces.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SearchSpacesController],
  providers: [SearchSpacesService, PrismaService],
  exports: [SearchSpacesService],
})
export class SearchSpacesModule {}
