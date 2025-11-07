import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleGmailController } from './google-gmail.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [GoogleCalendarController, GoogleGmailController],
  providers: [PrismaService],
})
export class GoogleAuthModule {}
