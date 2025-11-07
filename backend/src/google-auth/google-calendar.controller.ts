import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SearchSourceConnectorType } from '@prisma/client';
import { Response } from 'express';

@Controller('auth/google/calendar/connector')
export class GoogleCalendarController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('add')
  @UseGuards(JwtAuthGuard)
  async connectCalendar(
    @Query('space_id') spaceId: string,
    @Req() req: any,
  ): Promise<{ auth_url: string }> {
    try {
      if (!spaceId) {
        throw new BadRequestException('space_id is required');
      }

      const searchSpaceId = parseInt(spaceId, 10);
      const userId = req.user.id;

      const clientId = this.configService.get<string>('google.oauth.clientId');
      const redirectUri = this.configService.get<string>(
        'google.calendar.redirectUri',
      );

      if (!clientId || !redirectUri) {
        throw new InternalServerErrorException(
          'Google OAuth configuration missing',
        );
      }

      const state = Buffer.from(
        JSON.stringify({ space_id: searchSpaceId, user_id: userId }),
      ).toString('base64url');

      const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${state}`;

      return { auth_url: authUrl };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to initiate Google OAuth: ${error.message}`,
      );
    }
  }

  @Get('callback')
  async calendarCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing required parameters');
      }

      const decodedState = JSON.parse(
        Buffer.from(state, 'base64url').toString(),
      );
      const userId = decodedState.user_id;
      const spaceId = decodedState.space_id;

      const clientId = this.configService.get<string>('google.oauth.clientId');
      const clientSecret = this.configService.get<string>(
        'google.oauth.clientSecret',
      );
      const redirectUri = this.configService.get<string>(
        'google.calendar.redirectUri',
      );

      const tokenResponse = await fetch(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new InternalServerErrorException('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      const existing = await this.prisma.searchSourceConnector.findFirst({
        where: {
          searchSpaceId: spaceId,
          userId,
          connectorType: SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR,
        },
      });

      if (existing) {
        throw new ConflictException(
          'A GOOGLE_CALENDAR_CONNECTOR connector already exists in this search space',
        );
      }

      await this.prisma.searchSourceConnector.create({
        data: {
          name: 'Google Calendar Connector',
          connectorType: SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR,
          config: tokens,
          searchSpaceId: spaceId,
          userId,
          isIndexable: true,
        },
      });

      const frontendUrl = this.configService.get<string>('frontend.url');
      return res.redirect(
        `${frontendUrl}/dashboard/${spaceId}/connectors/add/google-calendar-connector?success=true`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to complete Google OAuth: ${error.message}`,
      );
    }
  }
}
