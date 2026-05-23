import { Module } from '@nestjs/common';
import { SearchSpacesController } from './search-spaces.controller';
import { SearchSpacesService } from './search-spaces.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  controllers: [SearchSpacesController],
  providers: [SearchSpacesService, PrismaService],
  imports: [PermissionsModule],
  exports: [SearchSpacesService],
})
export class SearchSpacesModule {}
