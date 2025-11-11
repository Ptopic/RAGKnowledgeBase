/**
 * Notion connector indexer service.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { LLMService } from "../../agent/services/llm.service";
import { NotionConnector } from "../../connectors/notion.connector";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "../../retriever/embedding.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import {
	generateContentHash,
	generateDocumentSummary,
	generateUniqueIdentifierHash,
} from "../../utils/document-converters";
import { ConnectorIndexerBaseService } from "./base.service";

interface NotionBlock {
	id: string;
	type: string;
	content: string;
	children: NotionBlock[];
}

@Injectable()
export class NotionIndexerService {
	private readonly logger = new Logger(NotionIndexerService.name);
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
	 * Convert Notion blocks to markdown format recursively.
	 */
	private processBlocks(blocks: NotionBlock[], level = 0): string {
		let result = "";

		for (const block of blocks) {
			const blockType = block.type;
			const blockContent = block.content || "";
			const children = block.children || [];

			// Add indentation based on level
			const indent = "  ".repeat(level);

			// Format based on block type
			if (blockType === "paragraph" || blockType === "text") {
				result += `${indent}${blockContent}\n\n`;
			} else if (blockType === "heading_1" || blockType === "header") {
				result += `${indent}# ${blockContent}\n\n`;
			} else if (blockType === "heading_2") {
				result += `${indent}## ${blockContent}\n\n`;
			} else if (blockType === "heading_3") {
				result += `${indent}### ${blockContent}\n\n`;
			} else if (blockType === "bulleted_list_item") {
				result += `${indent}* ${blockContent}\n`;
			} else if (blockType === "numbered_list_item") {
				result += `${indent}1. ${blockContent}\n`;
			} else if (blockType === "to_do") {
				result += `${indent}- [ ] ${blockContent}\n`;
			} else if (blockType === "toggle") {
				result += `${indent}> ${blockContent}\n`;
			} else if (blockType === "code") {
				result += `${indent}${blockContent}\n\n`;
			} else if (blockType === "quote") {
				result += `${indent}> ${blockContent}\n\n`;
			} else if (blockType === "callout") {
				result += `${indent}> **Note:** ${blockContent}\n\n`;
			} else if (blockType === "image") {
				result += `${indent}${blockContent}\n\n`;
			} else {
				// Default for other block types
				if (blockContent) {
					result += `${indent}${blockContent}\n\n`;
				}
			}

			// Process children recursively
			if (children && children.length > 0) {
				result += this.processBlocks(children, level + 1);
			}
		}

		return result;
	}

	/**
	 * Index Notion pages for a connector.
	 *
	 * @param connectorId - ID of the connector
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @param startDate - Optional start date for indexing (YYYY-MM-DD)
	 * @param endDate - Optional end date for indexing (YYYY-MM-DD)
	 */
	async indexNotionPages(
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
			"notion_pages_indexing",
			"connector_indexing_task",
			`Starting Notion pages indexing for connector ${connectorId}`,
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
				`Retrieving Notion connector ${connectorId} from database`,
				{ stage: "connector_retrieval" },
			);

			const connector = await this.baseService.getConnectorById(
				connectorId,
				// biome-ignore lint/suspicious/noExplicitAny: SearchSourceConnectorType enum type assertion
				"NOTION_CONNECTOR" as any,
			);

			if (!connector) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Connector with ID ${connectorId} not found or is not a Notion connector`,
					"Connector not found",
					{ error_type: "ConnectorNotFound" },
				);
				throw new Error(
					`Connector with ID ${connectorId} not found or is not a Notion connector`,
				);
			}

			// Get the Notion token from the connector config
			// biome-ignore lint/suspicious/noExplicitAny: Connector config structure varies
			const notionToken = (connector.config as any)?.NOTION_INTEGRATION_TOKEN;
			if (!notionToken) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Notion integration token not found in connector config for connector ${connectorId}`,
					"Missing Notion token",
					{ error_type: "MissingToken" },
				);
				throw new Error(
					"Notion integration token not found in connector config",
				);
			}

			// Initialize Notion client
			await taskLogger.logTaskProgress(
				logEntry,
				`Initializing Notion client for connector ${connectorId}`,
				{ stage: "client_initialization" },
			);

			const notionClient = new NotionConnector(notionToken);

			// Calculate date range (convert to ISO format for Notion API)
			const [startDateStr, endDateStr] = this.baseService.calculateDateRange(
				connector,
				startDate,
				endDate,
				365, // Default to 1 year back
			);

			// Convert YYYY-MM-DD to ISO format
			const startDateISO = `${startDateStr}T00:00:00Z`;
			const endDateISO = `${endDateStr}T23:59:59Z`;

			this.logger.log(
				`Indexing Notion pages from ${startDateISO} to ${endDateISO}`,
			);

			await taskLogger.logTaskProgress(
				logEntry,
				`Fetching Notion pages from ${startDateISO} to ${endDateISO}`,
				{
					stage: "fetch_pages",
					start_date: startDateISO,
					end_date: endDateISO,
				},
			);

			// Get all pages
			// biome-ignore lint/suspicious/noExplicitAny: Notion page objects have dynamic structure
			let pages: any[];
			try {
				pages = await notionClient.getAllPages(startDateISO, endDateISO);
				this.logger.log(`Found ${pages.length} Notion pages`);
			} catch (error) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to get Notion pages for connector ${connectorId}`,
					error.message,
					{ error_type: "PageFetchError" },
				);
				throw new Error(`Failed to get Notion pages: ${error.message}`);
			}

			if (!pages || pages.length === 0) {
				await taskLogger.logTaskSuccess(
					logEntry,
					`No Notion pages found for connector ${connectorId}`,
					{ pages_found: 0 },
				);
				return;
			}

			// Track the number of documents indexed
			let documentsIndexed = 0;
			let documentsSkipped = 0;
			const skippedPages: string[] = [];

			await taskLogger.logTaskProgress(
				logEntry,
				`Starting to process ${pages.length} Notion pages`,
				{ stage: "process_pages", total_pages: pages.length },
			);

			// Process each page
			for (const page of pages) {
				try {
					const pageId = page.page_id;
					const pageTitle = page.title || `Untitled page (${pageId})`;
					const pageContent = page.content || [];

					this.logger.log(`Processing Notion page: ${pageTitle} (${pageId})`);

					if (!pageContent || pageContent.length === 0) {
						this.logger.log(`No content found in page ${pageTitle}. Skipping.`);
						skippedPages.push(`${pageTitle} (no content)`);
						documentsSkipped++;
						continue;
					}

					// Convert page content to markdown format
					let markdownContent = `# Notion Page: ${pageTitle}\n\n`;

					this.logger.debug(
						`Converting ${pageContent.length} blocks to markdown for page ${pageTitle}`,
					);
					markdownContent += this.processBlocks(pageContent);

					// Format document metadata
					const metadataSections: [string, string[]][] = [
						["METADATA", [`PAGE_TITLE: ${pageTitle}`, `PAGE_ID: ${pageId}`]],
						[
							"CONTENT",
							["FORMAT: markdown", "TEXT_START", markdownContent, "TEXT_END"],
						],
					];

					// Build the document string
					const combinedDocumentString =
						this.baseService.buildDocumentMetadataMarkdown(metadataSections);

					// Generate unique identifier hash for this Notion page
					const uniqueIdentifierHash = generateUniqueIdentifierHash(
						DocumentType.NOTION_CONNECTOR,
						pageId,
						searchSpaceId,
					);

					// Generate content hash (include pageId for uniqueness)
					const contentHash = generateContentHash(
						combinedDocumentString,
						searchSpaceId,
						pageId,
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
								`Document for Notion page ${pageTitle} unchanged. Skipping.`,
							);
							documentsSkipped++;
							continue;
						} else {
							// Content has changed - update the existing document
							this.logger.log(
								`Content changed for Notion page ${pageTitle}. Updating document.`,
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
									page_title: pageTitle,
									page_id: pageId,
									document_type: "Notion Page",
									connector_type: "Notion",
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
								summaryContent = `Notion Page: ${pageTitle}\n\n`;
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
									title: `Notion - ${pageTitle}`,
									content: summaryContent,
									contentHash: contentHash,
									documentMetadata: {
										page_title: pageTitle,
										page_id: pageId,
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
							this.logger.log(`Successfully updated Notion page: ${pageTitle}`);
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
							page_title: pageTitle,
							page_id: pageId,
							document_type: "Notion Page",
							connector_type: "Notion",
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
						summaryContent = `Notion Page: ${pageTitle}\n\n`;
						summaryEmbedding =
							await this.embeddingService.embed(summaryContent);
					}

					// Process chunks from raw content
					const chunks = await this.createDocumentChunks(markdownContent);

					// Create document with summary
					const document = await this.prisma.document.create({
						data: {
							searchSpaceId,
							title: `Notion - ${pageTitle}`,
							documentType: DocumentType.NOTION_CONNECTOR,
							documentMetadata: {
								page_title: pageTitle,
								page_id: pageId,
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
					this.logger.log(`Successfully indexed new Notion page: ${pageTitle}`);
				} catch (error) {
					this.logger.error(
						`Error processing Notion page ${page.title || "Unknown"}: ${error.message}`,
						error.stack,
					);
					skippedPages.push(`${page.title || "Unknown"} (processing error)`);
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
			if (skippedPages.length > 0) {
				resultMessage = `Processed ${totalProcessed} pages. Skipped ${skippedPages.length} pages: ${skippedPages.join(", ")}`;
			} else {
				resultMessage = `Processed ${totalProcessed} pages.`;
			}

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully completed Notion indexing for connector ${connectorId}`,
				{
					pages_processed: totalProcessed,
					documents_indexed: documentsIndexed,
					documents_skipped: documentsSkipped,
					skipped_pages_count: skippedPages.length,
					result_message: resultMessage,
				},
			);

			this.logger.log(
				`Notion indexing completed: ${documentsIndexed} documents indexed, ${documentsSkipped} skipped`,
			);
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to index Notion pages for connector ${connectorId}`,
				error.message,
				{ error_type: error.constructor.name },
			);
			this.logger.error(
				`Failed to index Notion pages: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
