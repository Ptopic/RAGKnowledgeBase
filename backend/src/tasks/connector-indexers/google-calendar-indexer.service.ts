/**
 * Google Calendar connector indexer service.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { LLMService } from "../../agent/services/llm.service";
import { GoogleCalendarConnector } from "../../connectors/google-calendar.connector";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "../../retriever/embedding.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import { SseService } from "../../sse/sse.service";
import {
	generateContentHash,
	generateDocumentSummary,
	generateUniqueIdentifierHash,
} from "../../utils/document-converters";
import { ConnectorIndexerBaseService } from "./base.service";

@Injectable()
export class GoogleCalendarIndexerService {
	private readonly logger = new Logger(GoogleCalendarIndexerService.name);
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor(
		private prisma: PrismaService,
		private baseService: ConnectorIndexerBaseService,
		private embeddingService: EmbeddingService,
		private llmService: LLMService,
		private sseService: SseService,
	) {
		// Initialize text splitter with reasonable defaults
		this.textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	}

	/**
	 * Create document chunks with embeddings.
	 */
	private async createDocumentChunks(
		content: string,
	): Promise<{ content: string; embedding: number[] }[]> {
		const chunks = await this.textSplitter.splitText(content);

		return Promise.all(
			chunks.map(async (chunkText) => {
				const embedding = await this.embeddingService.embed(chunkText);
				return {
					content: chunkText,
					embedding,
				};
			}),
		);
	}

	/**
	 * Index Google Calendar events for a connector.
	 *
	 * @param connectorId - ID of the connector
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @param startDate - Optional start date for indexing (YYYY-MM-DD)
	 * @param endDate - Optional end date for indexing (YYYY-MM-DD)
	 */
	async indexGoogleCalendarEvents(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: string,
		endDate?: string,
	): Promise<void> {
		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
			this.sseService,
		);

		// Log task start
		const logEntry = await taskLogger.logTaskStart(
			"google_calendar_events_indexing",
			"connector_indexing_task",
			`Starting Google Calendar events indexing for connector ${connectorId}`,
			{
				connector_id: connectorId,
				user_id: userId,
				start_date: startDate,
				end_date: endDate,
			},
		);

		let documentsProcessed = 0;
		let documentsSkipped = 0;
		const errors: string[] = [];

		try {
			// Get the connector
			await taskLogger.logTaskProgress(
				logEntry,
				`Retrieving Google Calendar connector ${connectorId} from database`,
				{ stage: "connector_retrieval" },
			);

			const connector = await this.baseService.getConnectorById(
				connectorId,
				// biome-ignore lint/suspicious/noExplicitAny: SearchSourceConnectorType enum type assertion
				"GOOGLE_CALENDAR_CONNECTOR" as any,
			);

			if (!connector) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Connector with ID ${connectorId} not found or is not a Google Calendar connector`,
					"Connector not found",
					{ error_type: "ConnectorNotFound" },
				);
				throw new Error(
					`Connector with ID ${connectorId} not found or is not a Google Calendar connector`,
				);
			}

			// Get the Google Calendar credentials from the connector config
			// biome-ignore lint/suspicious/noExplicitAny: Connector config structure varies
			const config = connector.config as any;
			const clientId = config?.client_id;
			const clientSecret = config?.client_secret;
			const refreshToken = config?.refresh_token;
			const accessToken = config?.access_token;
			const expiryDate = config?.expiry_date;

			if (!clientId || !clientSecret || !refreshToken) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Google Calendar credentials not found in connector config for connector ${connectorId}`,
					"Missing Google Calendar credentials",
					{ error_type: "MissingCredentials" },
				);
				throw new Error(
					"Google Calendar credentials not found in connector config",
				);
			}

			// Initialize Google Calendar connector client
			await taskLogger.logTaskProgress(
				logEntry,
				`Initializing Google Calendar client for connector ${connectorId}`,
				{ stage: "client_initialization" },
			);

			let calendarClient: GoogleCalendarConnector;
			try {
				calendarClient = new GoogleCalendarConnector(
					{
						client_id: clientId,
						client_secret: clientSecret,
						access_token: accessToken,
						refresh_token: refreshToken,
						expiry_date: expiryDate,
					},
					this.prisma,
					userId,
					connectorId,
				);
			} catch (error) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to initialize Google Calendar client for connector ${connectorId}`,
					error.message,
					{ error_type: "ClientInitializationError" },
				);
				throw new Error(
					`Failed to initialize Google Calendar client: ${error.message}`,
				);
			}

			// Calculate date range
			const [startDateStr, endDateStr] = this.baseService.calculateDateRange(
				connector,
				startDate,
				endDate,
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Fetching Google Calendar events from ${startDateStr} to ${endDateStr}`,
				{
					stage: "fetching_events",
					start_date: startDateStr,
					end_date: endDateStr,
				},
			);

			this.logger.log(`Fetching events from ${startDateStr} to ${endDateStr}`);

			// Get events within date range from primary calendar
			const [events, error] = await calendarClient.getAllPrimaryCalendarEvents(
				startDateStr,
				endDateStr,
			);

			if (error) {
				this.logger.error(`Failed to get Google Calendar events: ${error}`);

				// Don't treat "No events found" as a critical error
				if (error.includes("No events found")) {
					this.logger.log(
						"No events found is not a critical error, updating last_indexed_at",
					);
					await this.baseService.updateConnectorLastIndexed(connector);

					await taskLogger.logTaskSuccess(
						logEntry,
						`No Google Calendar events found in date range ${startDateStr} to ${endDateStr}`,
						{ events_found: 0 },
					);
					return;
				} else {
					await taskLogger.logTaskFailure(
						logEntry,
						`Failed to get Google Calendar events: ${error}`,
						"API Error",
						{ error_type: "APIError" },
					);
					throw new Error(`Failed to get Google Calendar events: ${error}`);
				}
			}

			this.logger.log(
				`Retrieved ${events.length} events from Google Calendar API`,
			);

			// Process each event
			for (const event of events) {
				try {
					const eventId = event.id;
					const eventSummary = event.summary || "No Title";
					// biome-ignore lint/suspicious/noExplicitAny: Event type may have calendarId
					const calendarId = (event as any).calendarId || "primary";

					if (!eventId) {
						this.logger.warn(`Skipping event with missing ID: ${eventSummary}`);
						documentsSkipped++;
						continue;
					}

					// Format event to markdown
					const eventMarkdown = calendarClient.formatEventToMarkdown(event);

					if (!eventMarkdown.trim()) {
						this.logger.warn(`Skipping event with no content: ${eventSummary}`);
						documentsSkipped++;
						continue;
					}

					const startTime = event.start.dateTime || event.start.date || "";
					const endTime = event.end.dateTime || event.end.date || "";
					const location = event.location || ""; // Generate unique identifier hash for this Google Calendar event
					const uniqueIdentifierHash = generateUniqueIdentifierHash(
						DocumentType.GOOGLE_CALENDAR_CONNECTOR,
						eventId,
						searchSpaceId,
					);

					// Generate content hash
					const contentHash = generateContentHash(
						eventMarkdown,
						searchSpaceId,
						eventId,
					); // Check if document with this unique identifier already exists
					const existingDocument =
						await this.baseService.checkDocumentByUniqueIdentifier(
							uniqueIdentifierHash,
						);

					if (existingDocument) {
						// Document exists - check if content has changed
						if (existingDocument.contentHash === contentHash) {
							this.logger.log(
								`Document for Google Calendar event ${eventSummary} unchanged. Skipping.`,
							);
							documentsSkipped++;
							continue;
						} else {
							// Content has changed - update the existing document
							this.logger.log(
								`Content changed for Google Calendar event ${eventSummary}. Updating document.`,
							);

							// Generate document summary with metadata
							const userLlm = await this.llmService.getUserLongContextLLM(
								userId,
								searchSpaceId,
							);

							let summaryContent: string;
							let summaryEmbedding: number[];

							if (userLlm) {
								const documentMetadata = {
									event_id: eventId,
									event_summary: eventSummary,
									calendar_id: calendarId,
									start_time: startTime,
									end_time: endTime,
									location: location,
									document_type: "Calendar Event",
									connector_type: "Google Calendar",
								};

								const summary = await generateDocumentSummary(
									eventMarkdown,
									userLlm,
									this.embeddingService,
									documentMetadata,
								);
								summaryContent = summary.summaryContent;
								summaryEmbedding = summary.summaryEmbedding;
							} else {
								// Fallback to simple summary if no LLM configured
								summaryContent = `Calendar Event: ${eventSummary}\n\n`;
								summaryContent += `Time: ${startTime} - ${endTime}\n`;
								if (location) summaryContent += `Location: ${location}\n`;
								summaryEmbedding =
									await this.embeddingService.embed(summaryContent);
							}

							// Generate new chunks from raw content
							const chunks = await this.createDocumentChunks(eventMarkdown);

							// Delete old chunks first
							await this.prisma.chunk.deleteMany({
								where: { documentId: existingDocument.id },
							});

							// Update document with summary
							await this.prisma.document.update({
								where: { id: existingDocument.id },
								data: {
									title: `Calendar Event - ${eventSummary}`,
									content: summaryContent,
									contentHash: contentHash,
									documentMetadata: {
										event_id: eventId,
										event_summary: eventSummary,
										calendar_id: calendarId,
										start_time: startTime,
										end_time: endTime,
										location: location,
										indexed_at: new Date().toISOString(),
									},
								},
							});

							// Update document embedding using raw SQL
							await this.prisma.$executeRaw`
                UPDATE "documents"
                SET embedding = ${JSON.stringify(summaryEmbedding)}::vector
                WHERE id = ${existingDocument.id}
              `; // Insert new chunks
							for (const chunk of chunks) {
								const chunkRecord = await this.prisma.chunk.create({
									data: {
										content: chunk.content,
										documentId: existingDocument.id,
									},
								});

								// Update chunk embedding using raw SQL
								await this.prisma.$executeRaw`
                  UPDATE "chunks"
                  SET embedding = ${JSON.stringify(chunk.embedding)}::vector
                  WHERE id = ${chunkRecord.id}
                `;
							}

							documentsProcessed++;
							this.logger.log(
								`Successfully updated Google Calendar event ${eventSummary}`,
							);
							continue;
						}
					}

					// Document doesn't exist - create new one
					// Generate document summary with metadata
					const userLlm = await this.llmService.getUserLongContextLLM(
						userId,
						searchSpaceId,
					);

					let summaryContent: string;
					let summaryEmbedding: number[];

					if (userLlm) {
						const documentMetadata = {
							event_id: eventId,
							event_summary: eventSummary,
							calendar_id: calendarId,
							start_time: startTime,
							end_time: endTime,
							location: location,
							document_type: "Calendar Event",
							connector_type: "Google Calendar",
						};

						const summary = await generateDocumentSummary(
							eventMarkdown,
							userLlm,
							this.embeddingService,
							documentMetadata,
						);
						summaryContent = summary.summaryContent;
						summaryEmbedding = summary.summaryEmbedding;
					} else {
						// Fallback to simple summary if no LLM configured
						summaryContent = `Calendar Event: ${eventSummary}\n\n`;
						summaryContent += `Time: ${startTime} - ${endTime}\n`;
						if (location) summaryContent += `Location: ${location}\n`;
						summaryEmbedding =
							await this.embeddingService.embed(summaryContent);
					}

					// Process chunks from raw content
					const chunks = await this.createDocumentChunks(eventMarkdown);

					// Create document with summary
					const document = await this.prisma.document.create({
						data: {
							searchSpaceId,
							title: `Calendar Event - ${eventSummary}`,
							documentType: DocumentType.GOOGLE_CALENDAR_CONNECTOR,
							documentMetadata: {
								event_id: eventId,
								event_summary: eventSummary,
								calendar_id: calendarId,
								start_time: startTime,
								end_time: endTime,
								location: location,
								indexed_at: new Date().toISOString(),
							},
							content: summaryContent,
							contentHash,
							uniqueIdentifierHash,
						},
					});

					// Update document embedding using raw SQL
					await this.prisma.$executeRaw`
            UPDATE "documents"
            SET embedding = ${JSON.stringify(summaryEmbedding)}::vector
            WHERE id = ${document.id}
          `; // Insert chunks with embeddings
					for (const chunk of chunks) {
						const chunkRecord = await this.prisma.chunk.create({
							data: {
								content: chunk.content,
								documentId: document.id,
							},
						});

						// Update chunk embedding using raw SQL
						await this.prisma.$executeRaw`
              UPDATE "chunks"
              SET embedding = ${JSON.stringify(chunk.embedding)}::vector
              WHERE id = ${chunkRecord.id}
            `;
					}

					documentsProcessed++;
					this.logger.log(`Successfully indexed new event ${eventSummary}`);
				} catch (error) {
					this.logger.error(
						`Error processing event ${event.summary || "Unknown"}: ${error.message}`,
						error.stack,
					);
					errors.push(`${event.summary || "Unknown"}: ${error.message}`);
					documentsSkipped++;
				}
			}

			// Update the last_indexed_at timestamp for the connector
			if (documentsProcessed > 0) {
				await this.baseService.updateConnectorLastIndexed(connector);
			}

			this.logger.log(
				`Finished Google Calendar indexing for connector ${connectorId}. Processed ${documentsProcessed} events, skipped ${documentsSkipped}.`,
			);

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully completed Google Calendar indexing for connector ${connectorId}`,
				{
					events_processed: documentsProcessed,
					documents_skipped: documentsSkipped,
					errors_count: errors.length,
				},
			);
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to index Google Calendar events for connector ${connectorId}`,
				error.message,
				{ error_type: error.constructor.name },
			);
			this.logger.error(
				`Failed to index Google Calendar events: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
