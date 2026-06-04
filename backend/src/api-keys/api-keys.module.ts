import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule, ConfigModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, PrismaService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
