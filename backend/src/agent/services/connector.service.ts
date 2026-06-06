import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { RetrieverService } from "src/retriever/retriever.service";
import { SearchMode } from "../dtos/researcher.dto";
import { getConnectorFriendlyName } from "../utils/agent.utils";
import { Document } from "../utils/agent.utils";

interface SourceObject {
	id: number;
	name: string;
	type: string;
	sources: Array<{
		id: string | number;
		title: string;
		description: string;
		url: string;
	}>;
}

/**
 * Connector Service for fetching documents from various sources
 * Includes detailed metadata formatting for each connector type
 */
@Injectable()
export class ConnectorService {
	private readonly logger = new Logger(ConnectorService.name);
	private sourceIdCounter: number = 100000;

	constructor(
		private prisma: PrismaService,
		private retrieverService: RetrieverService,
	) {}

	/**
	 * Initialize the source ID counter based on total chunks for the user
	 */
	async initializeCounter(userId: string): Promise<void> {
		try {
			const chunkCount = await this.prisma.chunk.count({
				where: {
					document: {
						searchSpace: {
							userId,
						},
					},
				},
			});

			this.sourceIdCounter = chunkCount + 1;
			this.logger.log(
				`Initialized source_id_counter to ${this.sourceIdCounter} for user ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				`Error initializing source_id_counter: ${error.message}`,
			);
			this.sourceIdCounter = 1;
		}
	}

	/**
	 * Get next source ID
	 */
	private getNextSourceId(): number {
		return this.sourceIdCounter++;
	}

	/**
	 * Search YouTube videos
	 */
	async searchYouTube(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"YOUTUBE_VIDEO",
			"YouTube",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search crawled URLs
	 */
	async searchCrawledUrls(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"CRAWLED_URL",
			"Web Pages",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search files
	 */
	async searchFiles(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"FILE",
			"Files",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search Slack messages
	 */
	async searchSlack(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"SLACK_CONNECTOR",
			"Slack",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search Notion pages
	 */
	async searchNotion(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"NOTION_CONNECTOR",
			"Notion",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search GitHub repositories
	 */
	async searchGitHub(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"GITHUB_CONNECTOR",
			"GitHub",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Search Google Calendar events.
	 *
	 * Calendar events are very different from documents: the chunk text is
	 * mostly structured markdown (date strings, "Event Details", "Attendees"),
	 * so a hybrid-search query like "what events did I have last week" shares
	 * almost no keywords with the event bodies and the embedding is far from
	 * the chunk's embedding. To answer time-scoped questions we ALSO run a
	 * structured Prisma fetch over `documentMetadata->>'start_time'` and merge
	 * those hits with the hybrid-search hits. The two result sets are
	 * deduplicated by document id and the union is re-ranked.
	 */
	async searchGoogleCalendar(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		const [hybridResult, timeWindowChunks] = await Promise.all([
			this.searchDocumentType(
				"GOOGLE_CALENDAR_CONNECTOR",
				"Google Calendar",
				userQuery,
				userId,
				searchSpaceId,
				topK,
				searchMode,
			),
			this.fetchRecentCalendarDocuments(userId, searchSpaceId, topK),
		]);

		if (timeWindowChunks.length === 0) {
			return hybridResult;
		}

		// Merge: time-window hits first (sorted by recency), then hybrid hits
		// we haven't already surfaced. Cap each set to `topK` so the merged
		// result stays bounded to ~2x topK before downstream truncation.
		const seenDocIds = new Set<string | number>();
		const merged: Document[] = [];

		for (const chunk of [...timeWindowChunks, ...hybridResult.chunks]) {
			const id = chunk.document.id;
			if (seenDocIds.has(id)) continue;
			seenDocIds.add(id);
			merged.push(chunk);
		}

		return {
			sourceObject: {
				...hybridResult.sourceObject,
				sources: merged.map((c) => this.formatCalendarSourceEntry(c)),
			},
			// Cap at topK from each path (time-window + hybrid) so the merged
			// result stays bounded to ~2x topK before downstream truncation.
			chunks: merged.slice(0, topK + Math.min(hybridResult.chunks.length, topK)),
		};
	}

	/**
	 * Fetch the user's calendar documents within a recency window
	 * (default: last 90 days, next 30 days), ordered by start_time DESC.
	 *
	 * Uses Prisma's JSONB operator on `documentMetadata` to filter by
	 * `start_time` and returns one chunk per document (the first one)
	 * because events are short enough that all chunks of a single event
	 * carry essentially the same information.
	 */
	private async fetchRecentCalendarDocuments(
		userId: string,
		searchSpaceId: number,
		topK: number,
	): Promise<Document[]> {
		try {
			const now = new Date();
			const windowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
			const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			// We pull a wider candidate set so that, after filtering on the
			// JSONB start_time range below, we still have enough rows to fill
			// `topK`. A power user with thousands of past events would otherwise
			// have older events starve the recent ones, so we cap at 200.
			const candidateLimit = Math.min(Math.max(topK * 4, 100), 200);

			const documents = await this.prisma.document.findMany({
				where: {
					searchSpace: { userId },
					searchSpaceId,
					documentType: DocumentType.GOOGLE_CALENDAR_CONNECTOR,
					documentMetadata: {
						path: ["start_time"],
						not: null,
					},
				},
				include: {
					chunks: {
						orderBy: { id: "asc" },
						take: 1,
					},
				},
				take: candidateLimit,
			});

			const inWindow = documents
				.filter((doc) => {
					const startTime = (doc.documentMetadata as any)?.start_time;
					if (typeof startTime !== "string" || !startTime) return false;
					const t = new Date(startTime);
					if (Number.isNaN(t.getTime())) return false;
					return t >= windowStart && t <= windowEnd;
				})
				.sort((a, b) => {
					const ta = new Date(
						(a.documentMetadata as any)?.start_time as string,
					).getTime();
					const tb = new Date(
						(b.documentMetadata as any)?.start_time as string,
					).getTime();
					return tb - ta;
				})
				.slice(0, topK);

			return inWindow.map((doc) => {
				const chunk = doc.chunks[0];
				return {
					chunk_id: chunk?.id ?? doc.id,
					content: chunk?.content ?? doc.content ?? "",
					score: 1.0,
					document: {
						id: doc.id,
						title: doc.title,
						document_type: "GOOGLE_CALENDAR_CONNECTOR",
						metadata: (doc.documentMetadata as any) ?? {},
					},
					source: "GOOGLE_CALENDAR_CONNECTOR",
				};
			});
		} catch (error) {
			this.logger.error(
				`Error fetching recent calendar documents: ${error.message}`,
				error.stack,
			);
			return [];
		}
	}

	/**
	 * Build a calendar-specific source entry. We can't reuse the generic
	 * `formatSourceEntry` switch for merged results because that switch
	 * branches on document type and the merged path bypasses it.
	 */
	private formatCalendarSourceEntry(chunk: Document): {
		id: string | number;
		title: string;
		description: string;
		url: string;
	} {
		const metadata = chunk.document.metadata || {};
		const eventSummary = metadata.event_summary || chunk.document.title;
		const startTime = metadata.start_time || "";
		const eventId = metadata.event_id || "";

		let title = `Calendar: ${eventSummary}`;
		if (startTime) {
			if (startTime.includes("T")) {
				const dt = new Date(startTime);
				if (!Number.isNaN(dt.getTime())) {
					title += ` (${dt.toLocaleString("en-US", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
					})})`;
				} else {
					title += ` (${startTime})`;
				}
			} else {
				title += ` (${startTime})`;
			}
		}

		const description = chunk.content || "";
		const url = eventId
			? `https://calendar.google.com/calendar/event?eid=${eventId}`
			: "";

		return {
			id: chunk.chunk_id,
			title,
			description: this.truncateDescription(description),
			url,
		};
	}

	/**
	 * Search Gmail messages
	 */
	async searchGoogleGmail(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			"GOOGLE_GMAIL_CONNECTOR",
			"Gmail",
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
		);
	}

	/**
	 * Generic document type search
	 */
	private async searchDocumentType(
		documentType: string,
		friendlyName: string,
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
		titleFilter?: string,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		try {
			let results: any[];

			if (searchMode === SearchMode.CHUNKS) {
				results = await this.retrieverService.searchChunks({
					queryText: userQuery,
					topK,
					userId,
					searchSpaceId,
					documentType: documentType as DocumentType,
					titleFilter,
				});
			} else {
				results = await this.retrieverService.searchDocuments({
					queryText: userQuery,
					topK,
					userId,
					searchSpaceId,
					documentType: documentType as DocumentType,
					titleFilter,
				});
			}

			// Early return if no results
			if (!results || results.length === 0) {
				return {
					sourceObject: {
						id: this.getNextSourceId(),
						name: friendlyName,
						type: documentType,
						sources: [],
					},
					chunks: [],
				};
			}

			// Transform results to Document format
			const chunks: Document[] = results.map((result) => {
				const document = result.document || result;
				const metadata = document.metadata || document.documentMetadata || {};

				return {
					chunk_id: result.chunk_id || this.getNextSourceId(),
					content: result.content || "",
					score: result.score || 0,
					document: {
						id: document.id,
						title: document.title || "Untitled",
						document_type: documentType,
						metadata,
					},
					source: documentType,
				};
			});

			// Create source object with detailed metadata formatting
			const sources = chunks.map((chunk) => {
				return this.formatSourceEntry(documentType, chunk);
			});

			const sourceObject: SourceObject = {
				id: this.getNextSourceId(),
				name: friendlyName,
				type: documentType,
				sources,
			};

			this.logger.log(
				`Found ${chunks.length} ${friendlyName} chunks for query: "${userQuery.substring(0, 50)}..."`,
			);

			return { sourceObject, chunks };
		} catch (error) {
			this.logger.error(
				`Error searching ${documentType}: ${error.message}`,
				error.stack,
			);
			return {
				sourceObject: {
					id: this.getNextSourceId(),
					name: friendlyName,
					type: documentType,
					sources: [],
				},
				chunks: [],
			};
		}
	}

	/**
	 * Format source entry with detailed connector-specific metadata
	 * Provides rich formatting for 15+ different connector types
	 */
	private formatSourceEntry(
		documentType: string,
		chunk: Document,
	): { id: string | number; title: string; description: string; url: string } {
		const document = chunk.document;
		const metadata = document.metadata || {};
		const content = chunk.content || "";

		switch (documentType) {
			case "LINEAR_CONNECTOR": {
				// Extract Linear-specific metadata
				const issueIdentifier = metadata.issue_identifier || "";
				const issueTitle = metadata.issue_title || document.title;
				const issueState = metadata.state || "";
				const commentCount = metadata.comment_count || 0;

				// Create descriptive title
				let title = issueIdentifier
					? `Linear: ${issueIdentifier} - ${issueTitle}`
					: `Linear: ${issueTitle}`;
				if (issueState) {
					title += ` (${issueState})`;
				}

				// Create description
				let description = content;
				if (commentCount) {
					description += ` | Comments: ${commentCount}`;
				}

				// Create URL
				const url = issueIdentifier
					? `https://linear.app/issue/${issueIdentifier}`
					: "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "SLACK_CONNECTOR": {
				// Extract Slack-specific metadata
				const channelName = metadata.channel_name || "Unknown Channel";
				const channelId = metadata.channel_id || "";
				const messageDate = metadata.start_date || "";

				let title = `Slack: ${channelName}`;
				if (messageDate) {
					title += ` (${messageDate})`;
				}

				const description = content;
				const url = channelId
					? `https://slack.com/app_redirect?channel=${channelId}`
					: "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "NOTION_CONNECTOR": {
				// Extract Notion-specific metadata
				const pageTitle = metadata.page_title || document.title;
				const pageId = metadata.page_id || "";

				const title = `Notion: ${pageTitle}`;
				const description = content;
				const url = pageId
					? `https://notion.so/${pageId.replace(/-/g, "")}`
					: "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "GITHUB_CONNECTOR": {
				const title = `GitHub: ${document.title}`;
				const description =
					metadata.description || this.truncateDescription(content);
				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description,
					url,
				};
			}

			case "YOUTUBE_VIDEO": {
				// Extract YouTube-specific metadata
				const videoTitle = metadata.video_title || document.title;
				const videoId = metadata.video_id || "";
				const channelName = metadata.channel_name || "";

				let title = videoTitle;
				if (channelName) {
					title += ` - ${channelName}`;
				}

				const description =
					metadata.description || this.truncateDescription(content);
				const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

				return {
					id: chunk.chunk_id,
					title,
					description,
					url,
				};
			}

			case "DISCORD_CONNECTOR": {
				// Extract Discord-specific metadata
				const channelName = metadata.channel_name || "Unknown Channel";
				const channelId = metadata.channel_id || "";
				const guildId = metadata.guild_id || "";
				const messageDate = metadata.start_date || "";

				let title = `Discord: ${channelName}`;
				if (messageDate) {
					title += ` (${messageDate})`;
				}

				const description = content;

				let url = "";
				if (guildId && channelId) {
					url = `https://discord.com/channels/${guildId}/${channelId}`;
				} else if (channelId) {
					url = `https://discord.com/channels/@me/${channelId}`;
				}

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "JIRA_CONNECTOR": {
				// Extract Jira-specific metadata
				const issueKey = metadata.issue_key || "Unknown Issue";
				const issueTitle = metadata.issue_title || "Untitled Issue";
				const status = metadata.status || "";
				const priority = metadata.priority || "";
				const issueType = metadata.issue_type || "";

				let title = `Jira: ${issueKey} - ${issueTitle}`;
				if (status) {
					title += ` (${status})`;
				}

				let description = content;
				if (priority) {
					description += ` | Priority: ${priority}`;
				}
				if (issueType) {
					description += ` | Type: ${issueType}`;
				}

				// Construct Jira URL
				const baseUrl = metadata.base_url || "";
				const url = baseUrl && issueKey ? `${baseUrl}/browse/${issueKey}` : "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "GOOGLE_CALENDAR_CONNECTOR": {
				// Extract Google Calendar-specific metadata
				const eventId = metadata.event_id || "Unknown Event";
				const eventSummary = metadata.event_summary || "Untitled Event";
				const calendarId = metadata.calendar_id || "";
				const startTime = metadata.start_time || "";
				const location = metadata.location || "";

				let title = `Calendar: ${eventSummary}`;
				if (startTime) {
					// Format the start time for display
					try {
						if (startTime.includes("T")) {
							const startDt = new Date(startTime);
							const formattedTime = startDt.toLocaleString("en-US", {
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
							});
							title += ` (${formattedTime})`;
						} else {
							title += ` (${startTime})`;
						}
					} catch {
						title += ` (${startTime})`;
					}
				}

				let description = content;
				if (location) {
					description += ` | Location: ${location}`;
				}
				if (calendarId && calendarId !== "primary") {
					description += ` | Calendar: ${calendarId}`;
				}

				// Construct Google Calendar URL
				const url = eventId
					? `https://calendar.google.com/calendar/event?eid=${eventId}`
					: "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "GOOGLE_GMAIL_CONNECTOR": {
				// Extract Gmail-specific metadata
				const subject = metadata.subject || document.title || "No Subject";
				const from = metadata.from || "";
				const date = metadata.date || "";
				const messageId = metadata.message_id || "";

				let title = `Gmail: ${subject}`;
				if (from) {
					title += ` (from: ${from})`;
				}
				if (date) {
					try {
						const dateDt = new Date(date);
						const formattedDate = dateDt.toLocaleDateString("en-US");
						title += ` - ${formattedDate}`;
					} catch {
						title += ` - ${date}`;
					}
				}

				const description = content;
				const url = messageId
					? `https://mail.google.com/mail/u/0/#inbox/${messageId}`
					: "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "AIRTABLE_CONNECTOR": {
				// Extract Airtable-specific metadata
				const baseName = metadata.base_name || "Unknown Base";
				const tableName = metadata.table_name || "Unknown Table";
				const recordId = metadata.record_id || "Unknown Record";
				const createdTime = metadata.created_time || "";

				let title = `Airtable: ${baseName} - ${tableName}`;
				if (recordId) {
					title += ` (Record: ${recordId.substring(0, 8)}...)`;
				}
				if (createdTime) {
					try {
						if (createdTime.includes("T")) {
							const createdDt = new Date(createdTime);
							const formattedTime = createdDt.toLocaleString("en-US", {
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
							});
							title += ` - ${formattedTime}`;
						}
					} catch {
						// Ignore formatting error
					}
				}

				const description = content;
				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "LUMA_CONNECTOR": {
				// Extract Luma-specific metadata
				const eventId = metadata.event_id || "";
				const eventName = metadata.event_name || "Untitled Event";
				const eventUrl = metadata.event_url || "";
				const startTime = metadata.start_time || "";
				const locationName = metadata.location_name || "";
				const meetingUrl = metadata.meeting_url || "";

				let title = `Luma: ${eventName}`;
				if (startTime) {
					try {
						if (startTime.includes("T")) {
							const startDt = new Date(startTime);
							const formattedTime = startDt.toLocaleString("en-US", {
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
							});
							title += ` (${formattedTime})`;
						}
					} catch {
						// Ignore formatting error
					}
				}

				let description = content;
				if (locationName) {
					description += ` | Venue: ${locationName}`;
				} else if (meetingUrl) {
					description += " | Online Event";
				}

				const url = eventUrl || "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "CRAWLED_URL": {
				const title = document.title;
				const description =
					metadata.og_description ||
					metadata.ogDescription ||
					this.truncateDescription(content);
				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description,
					url,
				};
			}

			case "ELASTICSEARCH_CONNECTOR": {
				// Prefer explicit title in metadata/source, otherwise fallback to doc.title
				const esTitle =
					metadata.title ||
					metadata.es_title ||
					document.title ||
					`Elasticsearch: ${metadata.elasticsearch_index || ""}`;

				const description =
					metadata.description || this.truncateDescription(content);

				// If a link or index info is stored, surface it
				const url = metadata.url || metadata.elasticsearch_index || "";

				return {
					id: chunk.chunk_id,
					title: esTitle,
					description,
					url,
				};
			}

			case "CONFLUENCE_CONNECTOR": {
				const pageTitle = metadata.page_title || document.title;
				const spaceKey = metadata.space_key || "";
				const pageId = metadata.page_id || "";

				let title = `Confluence: ${pageTitle}`;
				if (spaceKey) {
					title += ` (${spaceKey})`;
				}

				const description = content;
				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			case "CLICKUP_CONNECTOR": {
				const taskName = metadata.task_name || document.title;
				const taskId = metadata.task_id || "";
				const status = metadata.status || "";
				const priority = metadata.priority || "";

				let title = `ClickUp: ${taskName}`;
				if (status) {
					title += ` (${status})`;
				}

				let description = content;
				if (priority) {
					description += ` | Priority: ${priority}`;
				}

				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}

			default: {
				// FILE and other types
				const title = document.title;
				const description = content;
				const url = metadata.url || "";

				return {
					id: chunk.chunk_id,
					title,
					description: this.truncateDescription(description),
					url,
				};
			}
		}
	}

	/**
	 * Truncate description to reasonable length
	 */
	private truncateDescription(
		content: string,
		maxLength: number = 200,
	): string {
		if (!content) return "";
		return content.length > maxLength
			? content.substring(0, maxLength) + "..."
			: content;
	}

	/**
	 * Public method to format a source entry (for use by other services)
	 */
	formatSourceEntryPublic(
		documentType: string,
		chunk: Document,
	): { id: string | number; title: string; description: string; url: string } {
		return this.formatSourceEntry(documentType, chunk);
	}

	/**
	 * Public generic search entrypoint for any document type.
	 */
	async searchByDocumentType(
		documentType: string,
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number,
		searchMode: SearchMode,
		titleFilter?: string,
	): Promise<{ sourceObject: SourceObject; chunks: Document[] }> {
		return this.searchDocumentType(
			documentType,
			getConnectorFriendlyName(documentType),
			userQuery,
			userId,
			searchSpaceId,
			topK,
			searchMode,
			titleFilter,
		);
	}
}
