import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { SearchSpaceAccessGuard } from './guards/search-space-access.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
	providers: [PermissionsService, SearchSpaceAccessGuard, PrismaService],
	exports: [PermissionsService, SearchSpaceAccessGuard],
})
export class PermissionsModule {}
