import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Calendar, CalendarEvent } from './interfaces/connector.interface';
import { calendar_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SearchSourceConnectorType } from '@prisma/client';

/**
 * Google Calendar Connector for retrieving calendar events
 */

interface GoogleCredentialsConfig {
  client_id: string;
  client_secret: string;
  access_token?: string;
  refresh_token: string;
  expiry_date?: number;
}

@Injectable()
export class GoogleCalendarConnector {
  private readonly logger = new Logger(GoogleCalendarConnector.name);
  private calendar: calendar_v3.Calendar;
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly credentialsConfig: GoogleCredentialsConfig,
    private readonly prisma: PrismaService,
    private readonly userId: string,
    private readonly connectorId?: number,
  ) {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      credentialsConfig.client_id,
      credentialsConfig.client_secret,
    );

    // Set initial credentials
    this.oauth2Client.setCredentials({
      access_token: credentialsConfig.access_token,
      refresh_token: credentialsConfig.refresh_token,
      expiry_date: credentialsConfig.expiry_date,
    });
  }

  /**
   * Get valid Google OAuth credentials, refreshing if necessary
   */
  private async getCredentials(): Promise<OAuth2Client> {
    // Get access token (this will automatically refresh if expired)
    try {
      const tokenInfo = await this.oauth2Client.getAccessToken();
      
      // If token was refreshed, update database
      if (tokenInfo.token && this.oauth2Client.credentials) {
        const updatedConfig: GoogleCredentialsConfig = {
          ...this.credentialsConfig,
          access_token: tokenInfo.token,
          expiry_date: this.oauth2Client.credentials.expiry_date || undefined,
        };

        const connector = this.connectorId
          ? await this.prisma.searchSourceConnector.findUnique({ where: { id: this.connectorId } })
          : await this.prisma.searchSourceConnector.findFirst({
              where: {
                userId: this.userId,
                connectorType: SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR,
              },
            });

        if (connector) {
          await this.prisma.searchSourceConnector.update({
            where: { id: connector.id },
            // biome-ignore lint/suspicious/noExplicitAny: Prisma requires JsonValue type for config
            data: { config: updatedConfig as any },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to refresh credentials: ${error.message}`);
      throw new Error('Failed to refresh Google OAuth credentials');
    }

    return this.oauth2Client;
  }

  /**
   * Get the Google Calendar service instance
   */
  private async getService(): Promise<calendar_v3.Calendar> {
    if (!this.calendar) {
      const auth = await this.getCredentials();
      this.calendar = google.calendar({ version: 'v3', auth });
    }
    return this.calendar;
  }

  /**
   * Fetch list of user's calendars
   */
  async getCalendars(): Promise<[Calendar[], string | null]> {
    try {
      const service = await this.getService();
      const response = await service.calendarList.list();
      const calendars = response.data.items || [];
      
      const formatted: Calendar[] = calendars
        .filter(cal => cal.id && cal.summary)
        .map(cal => ({
          id: cal.id as string,
          summary: cal.summary as string,
          description: cal.description,
          primary: cal.primary,
          accessRole: cal.accessRole,
          timeZone: cal.timeZone,
        }));
      
      return [formatted, null];
    } catch (error) {
      this.logger.error(`Error fetching calendars: ${error.message}`);
      return [[], `Error fetching calendars: ${error.message}`];
    }
  }

  /**
   * Fetch events from primary calendar within date range
   */
  async getAllPrimaryCalendarEvents(
    startDate: string,
    endDate: string,
    maxResults: number = 2500,
  ): Promise<[CalendarEvent[], string | null]> {
    try {
      const service = await this.getService();
      
      const startDateTime = new Date(startDate).toISOString();
      const endDateTime = new Date(endDate).toISOString();
      
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        return [[], 'start_date must be before end_date'];
      }
      
      const response = await service.events.list({
        calendarId: 'primary',
        timeMin: startDateTime,
        timeMax: endDateTime,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items || [];
      
      if (events.length === 0) {
        return [[], 'No events found in the specified date range'];
      }
      
      return [events as CalendarEvent[], null];
    } catch (error) {
      this.logger.error(`Error fetching events: ${error.message}`);
      return [[], `Error fetching events: ${error.message}`];
    }
  }

  /**
   * Format calendar event to markdown
   */
  formatEventToMarkdown(event: CalendarEvent): string {
    const summary = event.summary || 'No Title';
    const description = event.description || '';
    const location = event.location || '';
    
    const startTime = event.start.dateTime || event.start.date || 'Unknown';
    const endTime = event.end.dateTime || event.end.date || 'Unknown';
    
    let markdown = `# ${summary}\n\n`;
    markdown += `**Start:** ${this.formatDateTime(startTime)}\n`;
    markdown += `**End:** ${this.formatDateTime(endTime)}\n`;
    
    if (location) {
      markdown += `**Location:** ${location}\n`;
    }
    
    markdown += '\n';
    
    if (description) {
      markdown += `## Description\n\n${description}\n\n`;
    }
    
    if (event.attendees && event.attendees.length > 0) {
      markdown += '## Attendees\n\n';
      for (const attendee of event.attendees) {
        const name = attendee.displayName || attendee.email;
        const status = attendee.responseStatus || '';
        markdown += `- ${name} (${status})\n`;
      }
      markdown += '\n';
    }
    
    markdown += '## Event Details\n\n';
    markdown += `- **Event ID:** ${event.id}\n`;
    if (event.created) markdown += `- **Created:** ${event.created}\n`;
    if (event.updated) markdown += `- **Updated:** ${event.updated}\n`;
    if (event.recurringEventId) markdown += `- **Recurring Event ID:** ${event.recurringEventId}\n`;
    
    return markdown;
  }

  private formatDateTime(dateTimeStr: string): string {
    try {
      if (dateTimeStr.includes('T')) {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return dateTimeStr;
    } catch {
      return dateTimeStr;
    }
  }
}

