import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppConfigModule } from '../config/config.module';

/**
 * Module that provides connector dependencies
 * Note: Connectors (GitHubConnector, NotionConnector, etc.) are not registered as providers
 * because they require runtime parameters (tokens, credentials) that cannot be injected.
 * They should be instantiated directly when needed with the appropriate credentials.
 */
@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [],
  exports: [],
})
export class ConnectorsModule {}

