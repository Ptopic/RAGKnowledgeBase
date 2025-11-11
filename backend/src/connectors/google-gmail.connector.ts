import { Injectable, Logger } from "@nestjs/common";
import { SearchSourceConnectorType } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { gmail_v1, google } from "googleapis";
import { PrismaService } from "../prisma/prisma.service";
import { GmailMessage, GmailProfile } from "./interfaces/connector.interface";

/**
 * Google Gmail Connector for retrieving emails
 */

interface GoogleCredentialsConfig {
	client_id: string;
	client_secret: string;
	access_token?: string;
	refresh_token: string;
	expiry_date?: number;
}

@Injectable()
export class GoogleGmailConnector {
	private readonly logger = new Logger(GoogleGmailConnector.name);
	private gmail: gmail_v1.Gmail;
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
					? await this.prisma.searchSourceConnector.findUnique({
							where: { id: this.connectorId },
						})
					: await this.prisma.searchSourceConnector.findFirst({
							where: {
								userId: this.userId,
								connectorType: SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR,
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
	 * Get the Gmail service instance
	 */
	private async getService(): Promise<gmail_v1.Gmail> {
		if (!this.gmail) {
			const auth = await this.getCredentials();
			this.gmail = google.gmail({ version: "v1", auth });
		}
		return this.gmail;
	}

	/**
	 * Fetch user's Gmail profile information
	 */
	async getUserProfile(): Promise<[GmailProfile, string | null]> {
		try {
			const service = await this.getService();
			const response = await service.users.getProfile({ userId: "me" });

			return [
				{
					email_address: response.data.emailAddress!,
					messages_total: response.data.messagesTotal || 0,
					threads_total: response.data.threadsTotal || 0,
					history_id: response.data.historyId,
				},
				null,
			];
		} catch (error) {
			return [
				{} as GmailProfile,
				`Error fetching user profile: ${error.message}`,
			];
		}
	}

	/**
	 * Fetch list of messages from Gmail
	 */
	async getMessagesList(
		maxResults: number = 100,
		query: string = "",
		labelIds?: string[],
		includeSpamTrash: boolean = false,
	): Promise<[GmailMessage[], string | null]> {
		try {
			const service = await this.getService();
			const params: any = {
				userId: "me",
				maxResults,
				includeSpamTrash,
			};

			if (query) params.q = query;
			if (labelIds) params.labelIds = labelIds;

			const response = await service.users.messages.list(params);
			const messages = response.data.messages || [];

			return [messages as GmailMessage[], null];
		} catch (error) {
			return [[], `Error fetching messages list: ${error.message}`];
		}
	}

	/**
	 * Fetch detailed information for a specific message
	 */
	async getMessageDetails(
		messageId: string,
	): Promise<[GmailMessage, string | null]> {
		try {
			const service = await this.getService();
			const response = await service.users.messages.get({
				userId: "me",
				id: messageId,
				format: "full",
			});

			return [response.data as GmailMessage, null];
		} catch (error) {
			return [
				{} as GmailMessage,
				`Error fetching message details: ${error.message}`,
			];
		}
	}

	/**
	 * Fetch recent messages within date range
	 */
	async getRecentMessages(
		maxResults: number = 50,
		startDate?: string,
		endDate?: string,
	): Promise<[GmailMessage[], string | null]> {
		try {
			const queryParts: string[] = [];

			if (startDate) {
				const date = new Date(startDate);
				const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
				queryParts.push(`after:${formattedDate}`);
			} else {
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - 30);
				const formattedDate = `${cutoffDate.getFullYear()}/${(cutoffDate.getMonth() + 1).toString().padStart(2, "0")}/${cutoffDate.getDate().toString().padStart(2, "0")}`;
				queryParts.push(`after:${formattedDate}`);
			}

			if (endDate) {
				const date = new Date(endDate);
				const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
				queryParts.push(`before:${formattedDate}`);
			}

			const query = queryParts.join(" ");
			const [messagesList, error] = await this.getMessagesList(
				maxResults,
				query,
			);

			if (error) return [[], error];

			const detailedMessages: GmailMessage[] = [];
			for (const msg of messagesList) {
				const [details, detailError] = await this.getMessageDetails(msg.id);
				if (!detailError) {
					detailedMessages.push(details);
				}
			}

			return [detailedMessages, null];
		} catch (error) {
			return [[], `Error fetching recent messages: ${error.message}`];
		}
	}

	/**
	 * Extract text content from a Gmail message
	 */
	extractMessageText(message: GmailMessage): string {
		function getMessageParts(payload: any): any[] {
			const parts: any[] = [];
			if (payload.parts) {
				for (const part of payload.parts) {
					parts.push(...getMessageParts(part));
				}
			} else {
				parts.push(payload);
			}
			return parts;
		}

		try {
			const payload = message.payload;
			if (!payload) return "";

			const parts = getMessageParts(payload);
			let textContent = "";

			for (const part of parts) {
				const mimeType = part.mimeType || "";
				const data = part.body?.data || "";

				if (mimeType === "text/plain" && data) {
					const decoded = Buffer.from(data, "base64").toString("utf-8");
					textContent += decoded + "\n";
				} else if (mimeType === "text/html" && data && !textContent) {
					const decoded = Buffer.from(data, "base64").toString("utf-8");
					textContent = decoded.replace(/<[^>]+>/g, "");
				}
			}

			return textContent.trim();
		} catch (error) {
			return `Error extracting message text: ${error.message}`;
		}
	}

	/**
	 * Format Gmail message to markdown
	 */
	formatMessageToMarkdown(message: GmailMessage): string {
		try {
			const messageId = message.id || "";
			const threadId = message.threadId || "";
			const labelIds = message.labelIds || [];

			const headers = message.payload?.headers || [];
			const headerMap: Record<string, string> = {};

			for (const header of headers) {
				headerMap[header.name.toLowerCase()] = header.value;
			}

			const subject = headerMap["subject"] || "No Subject";
			const from = headerMap["from"] || "Unknown Sender";
			const to = headerMap["to"] || "Unknown Recipient";
			const date = headerMap["date"] || "Unknown Date";

			const messageText = this.extractMessageText(message);

			let markdown = `# ${subject}\n\n`;
			markdown += `**From:** ${from}\n`;
			markdown += `**To:** ${to}\n`;
			markdown += `**Date:** ${date}\n`;

			if (labelIds.length > 0) {
				markdown += `**Labels:** ${labelIds.join(", ")}\n`;
			}

			markdown += "\n";

			if (messageText) {
				markdown += `## Message Content\n\n${messageText}\n\n`;
			}

			markdown += "## Message Details\n\n";
			markdown += `- **Message ID:** ${messageId}\n`;
			markdown += `- **Thread ID:** ${threadId}\n`;

			if (message.snippet) {
				markdown += `- **Snippet:** ${message.snippet}\n`;
			}

			return markdown;
		} catch (error) {
			return `Error formatting message to markdown: ${error.message}`;
		}
	}
}
