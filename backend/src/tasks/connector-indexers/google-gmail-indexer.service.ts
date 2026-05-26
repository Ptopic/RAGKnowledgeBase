/**
 * Google Gmail connector indexer service.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { LLMService } from "../../agent/services/llm.service";
import { GoogleGmailConnector } from "../../connectors/google-gmail.connector";
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
export class GoogleGmailIndexerService {
	private readonly logger = new Logger(GoogleGmailIndexerService.name);
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
	 * Index Google Gmail messages for a connector.
	 *
	 * @param connectorId - ID of the connector
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @param startDate - Optional start date for indexing (YYYY-MM-DD)
	 * @param endDate - Optional end date for indexing (YYYY-MM-DD)
	 * @param maxMessages - Maximum number of messages to fetch (default: 1000)
	 */
	async indexGoogleGmailMessages(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: string,
		endDate?: string,
		maxMessages: number = 1000,
	): Promise<void> {
		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
			this.sseService,
		);

		// Log task start
		const logEntry = await taskLogger.logTaskStart(
			"google_gmail_messages_indexing",
			"connector_indexing_task",
			`Starting Gmail messages indexing for connector ${connectorId}`,
			{
				connector_id: connectorId,
				user_id: userId,
				max_messages: maxMessages,
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
				`Retrieving Gmail connector ${connectorId} from database`,
				{ stage: "connector_retrieval" },
			);

			const connector = await this.baseService.getConnectorById(
				connectorId,
				// biome-ignore lint/suspicious/noExplicitAny: SearchSourceConnectorType enum type assertion
				"GOOGLE_GMAIL_CONNECTOR" as any,
			);

			if (!connector) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Connector with ID ${connectorId} not found or is not a Gmail connector`,
					"Connector not found",
					{ error_type: "ConnectorNotFound" },
				);
				throw new Error(
					`Connector with ID ${connectorId} not found or is not a Gmail connector`,
				);
			}

			// Get the Gmail credentials from the connector config
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
					`Gmail credentials not found in connector config for connector ${connectorId}`,
					"Missing Gmail credentials",
					{ error_type: "MissingCredentials" },
				);
				throw new Error("Gmail credentials not found in connector config");
			}

			// Initialize Gmail connector client
			await taskLogger.logTaskProgress(
				logEntry,
				`Initializing Gmail client for connector ${connectorId}`,
				{ stage: "client_initialization" },
			);

			let gmailClient: GoogleGmailConnector;
			try {
				gmailClient = new GoogleGmailConnector(
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
					`Failed to initialize Gmail client for connector ${connectorId}`,
					error.message,
					{ error_type: "ClientInitializationError" },
				);
				throw new Error(`Failed to initialize Gmail client: ${error.message}`);
			}

			// Calculate date range
			const [startDateStr, endDateStr] = this.baseService.calculateDateRange(
				connector,
				startDate,
				endDate,
				30, // Default to 30 days for Gmail
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Fetching Gmail messages from ${startDateStr} to ${endDateStr}`,
				{
					stage: "fetching_messages",
					start_date: startDateStr,
					end_date: endDateStr,
					max_messages: maxMessages,
				},
			);

			this.logger.log(
				`Fetching messages from ${startDateStr} to ${endDateStr}, max ${maxMessages} messages`,
			);

			// Get recent Gmail messages
			const [messages, error] = await gmailClient.getRecentMessages(
				maxMessages,
				startDateStr,
				endDateStr,
			);

			if (error) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to fetch Gmail messages: ${error}`,
					"API Error",
					{ error_type: "APIError" },
				);
				throw new Error(`Failed to fetch Gmail messages: ${error}`);
			}

			if (!messages || messages.length === 0) {
				this.logger.log("No Gmail messages found in the specified date range");
				await this.baseService.updateConnectorLastIndexed(connector);

				await taskLogger.logTaskSuccess(
					logEntry,
					"No Gmail messages found in the specified date range",
					{ messages_count: 0 },
				);
				return;
			}

			this.logger.log(`Found ${messages.length} Gmail messages to index`);

			// Process each message
			for (const message of messages) {
				try {
					// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
					const messageId = (message as any).id || "";
					// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
					const threadId = (message as any).threadId || "";

					// Extract headers for subject and sender
					// biome-ignore lint/suspicious/noExplicitAny: Message structure varies
					const payload = (message as any).payload || {};
					const headers = payload.headers || [];

					let subject = "No Subject";
					let sender = "Unknown Sender";
					let dateStr = "Unknown Date";

					for (const header of headers) {
						const name = (header.name || "").toLowerCase();
						const value = header.value || "";
						if (name === "subject") {
							subject = value;
						} else if (name === "from") {
							sender = value;
						} else if (name === "date") {
							dateStr = value;
						}
					}

					if (!messageId) {
						this.logger.warn(`Skipping message with missing ID: ${subject}`);
						documentsSkipped++;
						continue;
					}

					// Format message to markdown
					const markdownContent = gmailClient.formatMessageToMarkdown(message);

					if (!markdownContent.trim()) {
						this.logger.warn(`Skipping message with no content: ${subject}`);
						documentsSkipped++;
						continue;
					}

					// Generate unique identifier hash for this Gmail message
					const uniqueIdentifierHash = generateUniqueIdentifierHash(
						DocumentType.GOOGLE_GMAIL_CONNECTOR,
						messageId,
						searchSpaceId,
					);

					// Generate content hash (include messageId for uniqueness)
					const contentHash = generateContentHash(
						markdownContent,
						searchSpaceId,
						messageId,
					);

					// Check if document with this unique identifier already exists
					const existingDocument =
						await this.baseService.checkDocumentByUniqueIdentifier(
							uniqueIdentifierHash,
						);

					if (existingDocument) {
						// Document exists - check if content has changed
						if (existingDocument.contentHash === contentHash) {
							this.logger.log(
								`Document for Gmail message ${subject} unchanged. Skipping.`,
							);
							documentsSkipped++;
							continue;
						} else {
							// Content has changed - update the existing document
							this.logger.log(
								`Content changed for Gmail message ${subject}. Updating document.`,
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
									message_id: messageId,
									thread_id: threadId,
									subject: subject,
									sender: sender,
									date: dateStr,
									document_type: "Gmail Message",
									connector_type: "Google Gmail",
								};

								const summary = await generateDocumentSummary(
									markdownContent,
									userLlm,
									this.embeddingService,
									documentMetadata,
								);
								summaryContent = summary.summaryContent;
								summaryEmbedding = summary.summaryEmbedding;
							} else {
								// Fallback to simple summary if no LLM configured
								summaryContent = `Google Gmail Message: ${subject}\n\n`;
								summaryContent += `Sender: ${sender}\n`;
								summaryContent += `Date: ${dateStr}\n`;
								summaryEmbedding =
									await this.embeddingService.embed(summaryContent);
							}

							// Generate new chunks from raw content
							const chunks = await this.createDocumentChunks(markdownContent);

							// Delete old chunks first
							await this.prisma.chunk.deleteMany({
								where: { documentId: existingDocument.id },
							});

							// Update document with summary
							await this.prisma.document.update({
								where: { id: existingDocument.id },
								data: {
									title: `Gmail: ${subject}`,
									content: summaryContent,
									contentHash: contentHash,
									documentMetadata: {
										message_id: messageId,
										thread_id: threadId,
										subject: subject,
										sender: sender,
										date: dateStr,
										connector_id: connectorId,
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
							this.logger.log(`Successfully updated Gmail message ${subject}`);
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
							message_id: messageId,
							thread_id: threadId,
							subject: subject,
							sender: sender,
							date: dateStr,
							document_type: "Gmail Message",
							connector_type: "Google Gmail",
						};

						const summary = await generateDocumentSummary(
							markdownContent,
							userLlm,
							this.embeddingService,
							documentMetadata,
						);
						summaryContent = summary.summaryContent;
						summaryEmbedding = summary.summaryEmbedding;
					} else {
						// Fallback to simple summary if no LLM configured
						summaryContent = `Google Gmail Message: ${subject}\n\n`;
						summaryContent += `Sender: ${sender}\n`;
						summaryContent += `Date: ${dateStr}\n`;
						summaryEmbedding =
							await this.embeddingService.embed(summaryContent);
					}

					// Process chunks from raw content
					const chunks = await this.createDocumentChunks(markdownContent);

					// Create document with summary
					const document = await this.prisma.document.create({
						data: {
							searchSpaceId,
							title: `Gmail: ${subject}`,
							documentType: DocumentType.GOOGLE_GMAIL_CONNECTOR,
							documentMetadata: {
								message_id: messageId,
								thread_id: threadId,
								subject: subject,
								sender: sender,
								date: dateStr,
								connector_id: connectorId,
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
					this.logger.log(`Successfully indexed new email ${subject}`);
				} catch (error) {
					this.logger.error(
						`Error processing message: ${error.message}`,
						error.stack,
					);
					errors.push(`Message processing error: ${error.message}`);
					documentsSkipped++;
				}
			}

			// Update the last_indexed_at timestamp for the connector
			if (documentsProcessed > 0) {
				await this.baseService.updateConnectorLastIndexed(connector);
			}

			this.logger.log(
				`Finished Gmail indexing for connector ${connectorId}. Processed ${documentsProcessed} messages, skipped ${documentsSkipped}.`,
			);

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully completed Gmail indexing for connector ${connectorId}`,
				{
					messages_processed: documentsProcessed,
					documents_skipped: documentsSkipped,
					errors_count: errors.length,
				},
			);
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to index Gmail messages for connector ${connectorId}`,
				error.message,
				{ error_type: error.constructor.name },
			);
			this.logger.error(
				`Failed to index Gmail messages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
