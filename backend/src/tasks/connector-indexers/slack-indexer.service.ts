/**
 * Slack connector indexer service.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { LLMService } from "../../agent/services/llm.service";
import { SlackConnector } from "../../connectors/slack.connector";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "../../retriever/embedding.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import {
	generateContentHash,
	generateDocumentSummary,
	generateUniqueIdentifierHash,
} from "../../utils/document-converters";
import { ConnectorIndexerBaseService } from "./base.service";

@Injectable()
export class SlackIndexerService {
	private readonly logger = new Logger(SlackIndexerService.name);
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor(
		private prisma: PrismaService,
		private baseService: ConnectorIndexerBaseService,
		private embeddingService: EmbeddingService,
		private llmService: LLMService,
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
	 * Index Slack messages for a connector.
	 *
	 * @param connectorId - ID of the connector
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @param startDate - Optional start date for indexing (YYYY-MM-DD)
	 * @param endDate - Optional end date for indexing (YYYY-MM-DD)
	 */
	async indexSlackMessages(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: string,
		endDate?: string,
	): Promise<void> {
		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
		);

		// Log task start
		const logEntry = await taskLogger.logTaskStart(
			"slack_messages_indexing",
			"connector_indexing_task",
			`Starting Slack messages indexing for connector ${connectorId}`,
			{
				connector_id: connectorId,
				user_id: userId,
				start_date: startDate,
				end_date: endDate,
			},
		);

		try {
			// Get the connector
			await taskLogger.logTaskProgress(
				logEntry,
				`Retrieving Slack connector ${connectorId} from database`,
				{ stage: "connector_retrieval" },
			);

			const connector = await this.baseService.getConnectorById(
				connectorId,
				// biome-ignore lint/suspicious/noExplicitAny: SearchSourceConnectorType enum type assertion
				"SLACK_CONNECTOR" as any,
			);

			if (!connector) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Connector with ID ${connectorId} not found or is not a Slack connector`,
					"Connector not found",
					{ error_type: "ConnectorNotFound" },
				);
				throw new Error(
					`Connector with ID ${connectorId} not found or is not a Slack connector`,
				);
			}

			// Get the Slack token from the connector config
			// biome-ignore lint/suspicious/noExplicitAny: Connector config structure varies
			const slackToken = (connector.config as any)?.SLACK_BOT_TOKEN;
			if (!slackToken) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Slack token not found in connector config for connector ${connectorId}`,
					"Missing Slack token",
					{ error_type: "MissingToken" },
				);
				throw new Error("Slack token not found in connector config");
			}

			// Initialize Slack client
			await taskLogger.logTaskProgress(
				logEntry,
				`Initializing Slack client for connector ${connectorId}`,
				{ stage: "client_initialization" },
			);

			const slackClient = new SlackConnector(slackToken);

			// Calculate date range
			await taskLogger.logTaskProgress(
				logEntry,
				"Calculating date range for Slack indexing",
				{
					stage: "date_calculation",
					provided_start_date: startDate,
					provided_end_date: endDate,
				},
			);

			const [startDateStr, endDateStr] = this.baseService.calculateDateRange(
				connector,
				startDate,
				endDate,
				365, // Default to 1 year back
			);

			this.logger.log(
				`Indexing Slack messages from ${startDateStr} to ${endDateStr}`,
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Fetching Slack channels from ${startDateStr} to ${endDateStr}`,
				{
					stage: "fetch_channels",
					start_date: startDateStr,
					end_date: endDateStr,
				},
			);

			// Get all channels
			// biome-ignore lint/suspicious/noExplicitAny: Slack channel objects have dynamic structure
			let channels: any[];
			try {
				channels = await slackClient.getAllChannels();
			} catch (error) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to get Slack channels for connector ${connectorId}`,
					error.message,
					{ error_type: "ChannelFetchError" },
				);
				throw new Error(`Failed to get Slack channels: ${error.message}`);
			}

			if (!channels || channels.length === 0) {
				await taskLogger.logTaskSuccess(
					logEntry,
					`No Slack channels found for connector ${connectorId}`,
					{ channels_found: 0 },
				);
				return;
			}

			// Track the number of documents indexed
			let documentsIndexed = 0;
			let documentsSkipped = 0;
			const skippedChannels: string[] = [];

			await taskLogger.logTaskProgress(
				logEntry,
				`Starting to process ${channels.length} Slack channels`,
				{ stage: "process_channels", total_channels: channels.length },
			);

			// Process each channel
			for (const channelObj of channels) {
				const channelId = channelObj.id;
				const channelName = channelObj.name;
				const isPrivate = channelObj.is_private;
				const isMember = channelObj.is_member;

				try {
					// If it's a private channel and the bot is not a member, skip
					if (isPrivate && !isMember) {
						this.logger.warn(
							`Bot is not a member of private channel ${channelName} (${channelId}). Skipping.`,
						);
						skippedChannels.push(`${channelName} (private, bot not a member)`);
						documentsSkipped++;
						continue;
					}

					// Get messages for this channel
					const [messages, error] = await slackClient.getHistoryByDateRange(
						channelId,
						startDateStr,
						endDateStr,
						1000, // Limit to 1000 messages per channel
					);

					if (error) {
						this.logger.warn(
							`Error getting messages from channel ${channelName}: ${error}`,
						);
						skippedChannels.push(`${channelName} (error: ${error})`);
						documentsSkipped++;
						continue;
					}

					if (!messages || messages.length === 0) {
						this.logger.log(
							`No messages found in channel ${channelName} for the specified date range.`,
						);
						documentsSkipped++;
						continue;
					}

					// Format messages with user info
					// biome-ignore lint/suspicious/noExplicitAny: Slack message objects have dynamic structure
					const formattedMessages: any[] = [];
					for (const msg of messages) {
						// Skip bot messages and system messages
						if (
							msg.subtype &&
							["bot_message", "channel_join", "channel_leave"].includes(
								msg.subtype,
							)
						) {
							continue;
						}

						const formattedMsg = await slackClient.formatMessage(msg, true);
						formattedMessages.push(formattedMsg);
					}

					if (formattedMessages.length === 0) {
						this.logger.log(
							`No valid messages found in channel ${channelName} after filtering.`,
						);
						documentsSkipped++;
						continue;
					}

					// Process each message
					for (const msg of formattedMessages) {
						const timestamp = msg.datetime || "Unknown Time";
						const msgTs = msg.timestamp || timestamp;
						const msgUserName = msg.user_name || "Unknown User";
						const msgUserEmail = msg.user_email || "Unknown Email";
						const msgText = msg.text || "";

						// Format document metadata
						const metadataSections: [string, string[]][] = [
							[
								"METADATA",
								[
									`CHANNEL_NAME: ${channelName}`,
									`CHANNEL_ID: ${channelId}`,
									`MESSAGE_TIMESTAMP: ${timestamp}`,
									`MESSAGE_USER_NAME: ${msgUserName}`,
									`MESSAGE_USER_EMAIL: ${msgUserEmail}`,
								],
							],
							[
								"CONTENT",
								["FORMAT: markdown", "TEXT_START", msgText, "TEXT_END"],
							],
						];

						// Build the document string
						const combinedDocumentString =
							this.baseService.buildDocumentMetadataMarkdown(metadataSections);

						// Generate unique identifier hash for this Slack message
						const uniqueIdentifier = `${channelId}_${msgTs}`;
						const uniqueIdentifierHash = generateUniqueIdentifierHash(
							DocumentType.SLACK_CONNECTOR,
							uniqueIdentifier,
							searchSpaceId,
						);

						// Generate content hash (include unique identifier for uniqueness)
						const contentHash = generateContentHash(
							combinedDocumentString,
							searchSpaceId,
							uniqueIdentifier,
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
									`Document for Slack message ${msgTs} in channel ${channelName} unchanged. Skipping.`,
								);
								documentsSkipped++;
								continue;
							} else {
								// Content has changed - update the existing document
								this.logger.log(
									`Content changed for Slack message ${msgTs} in channel ${channelName}. Updating document.`,
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
										channel_name: channelName,
										channel_id: channelId,
										start_date: startDateStr,
										end_date: endDateStr,
										message_count: formattedMessages.length,
										document_type: "Slack Messages",
										connector_type: "Slack",
									};

									const summary = await generateDocumentSummary(
										combinedDocumentString,
										userLlm,
										this.embeddingService,
										documentMetadata,
									);
									summaryContent = summary.summaryContent;
									summaryEmbedding = summary.summaryEmbedding;
								} else {
									// Fallback to simple summary if no LLM configured
									summaryContent = `Slack Messages from ${channelName}\n\n`;
									summaryContent += `Messages: ${formattedMessages.length}\n`;
									summaryContent += `Date Range: ${startDateStr} to ${endDateStr}\n`;
									summaryEmbedding =
										await this.embeddingService.embed(summaryContent);
								}

								// Generate new chunks from raw content
								const chunks = await this.createDocumentChunks(
									combinedDocumentString,
								);

								// Delete old chunks first
								await this.prisma.chunk.deleteMany({
									where: { documentId: existingDocument.id },
								});

								// Update document with summary
								await this.prisma.document.update({
									where: { id: existingDocument.id },
									data: {
										content: summaryContent,
										contentHash: contentHash,
										documentMetadata: {
											channel_name: channelName,
											channel_id: channelId,
											start_date: startDateStr,
											end_date: endDateStr,
											message_count: formattedMessages.length,
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

								documentsIndexed++;
								this.logger.log(`Successfully updated Slack message ${msgTs}`);
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
								channel_name: channelName,
								channel_id: channelId,
								start_date: startDateStr,
								end_date: endDateStr,
								message_count: formattedMessages.length,
								document_type: "Slack Messages",
								connector_type: "Slack",
							};

							const summary = await generateDocumentSummary(
								combinedDocumentString,
								userLlm,
								this.embeddingService,
								documentMetadata,
							);
							summaryContent = summary.summaryContent;
							summaryEmbedding = summary.summaryEmbedding;
						} else {
							// Fallback to simple summary if no LLM configured
							summaryContent = `Slack Messages from ${channelName}\n\n`;
							summaryContent += `Messages: ${formattedMessages.length}\n`;
							summaryContent += `Date Range: ${startDateStr} to ${endDateStr}\n`;
							summaryEmbedding =
								await this.embeddingService.embed(summaryContent);
						}

						// Process chunks from raw content
						const chunks = await this.createDocumentChunks(
							combinedDocumentString,
						);

						// Create document with summary
						const document = await this.prisma.document.create({
							data: {
								searchSpaceId,
								title: `Slack - ${channelName}`,
								documentType: DocumentType.SLACK_CONNECTOR,
								documentMetadata: {
									channel_name: channelName,
									channel_id: channelId,
									start_date: startDateStr,
									end_date: endDateStr,
									message_count: formattedMessages.length,
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
            `; // Insert chunks with embeddings using raw SQL
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

						documentsIndexed++;
					}

					this.logger.log(
						`Successfully indexed channel ${channelName} with ${formattedMessages.length} messages`,
					);
				} catch (error) {
					this.logger.error(
						`Error processing channel ${channelName}: ${error.message}`,
						error.stack,
					);
					skippedChannels.push(`${channelName} (processing error)`);
					documentsSkipped++;
				}
			}

			// Update the last_indexed_at timestamp for the connector
			const totalProcessed = documentsIndexed;
			if (totalProcessed > 0) {
				await this.baseService.updateConnectorLastIndexed(connector);
			}

			// Prepare result message
			let resultMessage: string;
			if (skippedChannels.length > 0) {
				resultMessage = `Processed ${totalProcessed} documents. Skipped ${skippedChannels.length} channels: ${skippedChannels.join(", ")}`;
			} else {
				resultMessage = `Processed ${totalProcessed} documents.`;
			}

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully completed Slack indexing for connector ${connectorId}`,
				{
					channels_processed: totalProcessed,
					documents_indexed: documentsIndexed,
					documents_skipped: documentsSkipped,
					skipped_channels_count: skippedChannels.length,
					result_message: resultMessage,
				},
			);

			this.logger.log(
				`Slack indexing completed: ${documentsIndexed} documents indexed, ${documentsSkipped} skipped`,
			);
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to index Slack messages for connector ${connectorId}`,
				error.message,
				{ error_type: error.constructor.name },
			);
			this.logger.error(
				`Failed to index Slack messages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
