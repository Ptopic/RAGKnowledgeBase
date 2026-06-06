import { Injectable, Logger } from "@nestjs/common";
import { SearchSourceConnectorType } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { calendar_v3, google } from "googleapis";
import { PrismaService } from "../prisma/prisma.service";
import { Calendar, CalendarEvent } from "./interfaces/connector.interface";

/**
 * Google Calendar Connector for retrieving calendar events
 */

interface GoogleCredentialsConfig {
	client_id: string;
	client_secret: string;
	access_token?: string;
	refresh_token: string;
	expiry_date?: number;
	scopes?: string[];
	token_uri?: string;
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
				const creds = this.oauth2Client.credentials;
				const updatedConfig: GoogleCredentialsConfig = {
					...this.credentialsConfig,
					access_token: tokenInfo.token,
					expiry_date: creds.expiry_date || undefined,
				};
				// Google may rotate the refresh_token; persist it when it does.
				if (typeof creds.refresh_token === "string" && creds.refresh_token) {
					updatedConfig.refresh_token = creds.refresh_token;
				}
				if (typeof creds.scope === "string" && creds.scope) {
					updatedConfig.scopes = creds.scope.split(" ");
				}
				// biome-ignore lint/suspicious/noExplicitAny: google-auth-library's
				// `Credentials` type does not expose `token_uri`, but the OAuth2
				// client populates it on refresh.
				const tokenUri = (creds as any).token_uri;
				if (typeof tokenUri === "string" && tokenUri) {
					updatedConfig.token_uri = tokenUri;
				}

				const connector = this.connectorId
					? await this.prisma.searchSourceConnector.findUnique({
							where: { id: this.connectorId },
						})
					: await this.prisma.searchSourceConnector.findFirst({
							where: {
								userId: this.userId,
								connectorType:
									SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR,
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
			throw new Error("Failed to refresh Google OAuth credentials");
		}

		return this.oauth2Client;
	}

	/**
	 * Get the Google Calendar service instance
	 */
	private async getService(): Promise<calendar_v3.Calendar> {
		if (!this.calendar) {
			const auth = await this.getCredentials();
			this.calendar = google.calendar({ version: "v3", auth });
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
				.filter((cal) => cal.id && cal.summary)
				.map((cal) => ({
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
				return [[], "start_date must be before end_date"];
			}

			const [calendars, calError] = await this.getCalendars();
			if (calError) {
				this.logger.warn(`getCalendars returned error: ${calError}`);
			}

			// Index every calendar the user can read from. `accessRole` is one of
			// "freeBusyReader" | "reader" | "writer" | "owner" | "none"; "none" means
			// we can't read events, so drop those. The previous implementation only
			// kept `primary` and any calendar whose summary literally contained
			// "work", which silently dropped the vast majority of user calendars.
			const readableAccessRoles = new Set([
				"freeBusyReader",
				"reader",
				"writer",
				"owner",
			]);
			const selectedCalendars = (calendars || []).filter((cal) => {
				if (!cal || !cal.id) return false;
				if (!cal.accessRole || !readableAccessRoles.has(cal.accessRole)) {
					return false;
				}
				return true;
			});

			// Last-resort fallback: if the calendar list came back empty (e.g. the
			// list call failed and `calendars` is []), still try the user's primary
			// calendar, which `calendarId: "primary"` resolves server-side.
			if (selectedCalendars.length === 0) {
				selectedCalendars.push({
					id: "primary",
					summary: "Primary",
					primary: true,
				});
			}

			const aggregatedEvents: CalendarEvent[] = [];

			for (const cal of selectedCalendars) {
				let evPageToken: string | undefined;
				do {
					const evResp = await service.events.list({
						calendarId: cal.id as string,
						timeMin: startDateTime,
						timeMax: endDateTime,
						maxResults: maxResults,
						singleEvents: true,
						orderBy: "startTime",
						pageToken: evPageToken,
					});

					const items = evResp.data.items || [];
					for (const item of items) {
						if (!item) continue;
						// Tag the event with its source calendar so the indexer can
						// record it in documentMetadata. The googleapis response does
						// not include a `calendarId` on items, so we attach it here.
						(aggregatedEvents as Array<CalendarEvent & { calendarId: string }>).push(
							Object.assign(item as CalendarEvent, {
								calendarId: cal.id as string,
							}),
						);
					}

					evPageToken = evResp.data.nextPageToken || undefined;
				} while (evPageToken);
			}

			if (aggregatedEvents.length === 0) {
				return [[], "No events found in the specified date range"];
			}

			aggregatedEvents.sort((a, b) => {
				const aStart = a.start?.dateTime || a.start?.date || "";
				const bStart = b.start?.dateTime || b.start?.date || "";
				const aTime = aStart ? new Date(aStart).getTime() : 0;
				const bTime = bStart ? new Date(bStart).getTime() : 0;
				return aTime - bTime;
			});

			return [aggregatedEvents, null];
		} catch (error) {
			this.logger.error(`Error fetching events: ${error.message}`);
			return [[], `Error fetching events: ${error.message}`];
		}
	}

	/**
	 * Format calendar event to markdown
	 */
	formatEventToMarkdown(event: CalendarEvent): string {
		const summary = event.summary || "No Title";
		const description = event.description || "";
		const location = event.location || "";
		const calendarId = event.calendarId || "";

		const startTime = event.start.dateTime || event.start.date || "Unknown";
		const endTime = event.end.dateTime || event.end.date || "Unknown";
		// Google returns `date` (without `T`) for all-day events and `dateTime`
		// for timed events.
		const isAllDay = !event.start.dateTime && !!event.start.date;

		let markdown = `# ${summary}\n\n`;
		markdown += `**Start:** ${this.formatDateTime(startTime)}\n`;
		markdown += `**End:** ${this.formatDateTime(endTime)}\n`;
		if (isAllDay) markdown += "**All Day Event**\n";

		if (location) {
			markdown += `**Location:** ${location}\n`;
		}

		if (calendarId) {
			markdown += `**Calendar ID:** ${calendarId}\n`;
		}

		markdown += "\n";

		if (description) {
			markdown += `## Description\n\n${description}\n\n`;
		}

		// Organizer is useful context that's not always captured by attendees.
		// biome-ignore lint/suspicious/noExplicitAny: googleapis attaches `organizer`
		// on the event; it isn't on the narrow CalendarEvent interface.
		const organizer = (event as any).organizer;
		if (organizer && (organizer.email || organizer.displayName)) {
			const organizerName = organizer.displayName || organizer.email;
			markdown += `## Organizer\n\n- ${organizerName}\n\n`;
		}

		if (event.attendees && event.attendees.length > 0) {
			markdown += "## Attendees\n\n";
			for (const attendee of event.attendees) {
				const name = attendee.displayName || attendee.email;
				const status = attendee.responseStatus || "";
				markdown += `- ${name} (${status})\n`;
			}
			markdown += "\n";
		}

		markdown += "## Event Details\n\n";
		markdown += `- **Event ID:** ${event.id}\n`;
		if (event.created) markdown += `- **Created:** ${event.created}\n`;
		if (event.updated) markdown += `- **Updated:** ${event.updated}\n`;
		if (event.recurringEventId)
			markdown += `- **Recurring Event ID:** ${event.recurringEventId}\n`;

		return markdown;
	}

	private formatDateTime(dateTimeStr: string): string {
		try {
			if (dateTimeStr.includes("T")) {
				const date = new Date(dateTimeStr);
				return date.toLocaleString("en-US", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
				});
			}
			return dateTimeStr;
		} catch {
			return dateTimeStr;
		}
	}
}
