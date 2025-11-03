import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppConfigModule } from '../config/config.module';

import { GitHubConnector } from './github.connector';
import { GoogleCalendarConnector } from './google-calendar.connector';
import { GoogleGmailConnector } from './google-gmail.connector';
import { NotionConnector } from './notion.connector';
import { SlackConnector } from './slack.connector';

/**
 * Module that provides all connector implementations
 */
@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [
    GitHubConnector,
    GoogleCalendarConnector,
    GoogleGmailConnector,
    NotionConnector,
    SlackConnector,
  ],
  exports: [
    GitHubConnector,
    GoogleCalendarConnector,
    GoogleGmailConnector,
    NotionConnector,
    SlackConnector,
  ],
})
export class ConnectorsModule {}

