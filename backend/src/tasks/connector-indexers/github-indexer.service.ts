/**
 * GitHub connector indexer service.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentType } from "@prisma/client";
import { LLMService } from "../../agent/services/llm.service";
import { GitHubConnector } from "../../connectors/github.connector";
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
export class GithubIndexerService {
	private readonly logger = new Logger(GithubIndexerService.name);
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
	 * Index GitHub repositories for a connector.
	 *
	 * @param connectorId - ID of the connector
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @param startDate - Optional start date for indexing (YYYY-MM-DD) - Note: GitHub indexing processes all files regardless of dates
	 * @param endDate - Optional end date for indexing (YYYY-MM-DD) - Note: GitHub indexing processes all files regardless of dates
	 */
	async indexGithubRepos(
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
			"github_repos_indexing",
			"connector_indexing_task",
			`Starting GitHub repositories indexing for connector ${connectorId}`,
			{
				connector_id: connectorId,
				user_id: userId,
				start_date: startDate,
				end_date: endDate,
			},
		);

		let documentsProcessed = 0;
		const errors: string[] = [];

		try {
			// Get the connector
			await taskLogger.logTaskProgress(
				logEntry,
				`Retrieving GitHub connector ${connectorId} from database`,
				{ stage: "connector_retrieval" },
			);

			const connector = await this.baseService.getConnectorById(
				connectorId,
				// biome-ignore lint/suspicious/noExplicitAny: SearchSourceConnectorType enum type assertion
				"GITHUB_CONNECTOR" as any,
			);

			if (!connector) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Connector with ID ${connectorId} not found or is not a GitHub connector`,
					"Connector not found",
					{ error_type: "ConnectorNotFound" },
				);
				throw new Error(
					`Connector with ID ${connectorId} not found or is not a GitHub connector`,
				);
			}

			// Get the GitHub PAT and selected repositories from the connector config
			// biome-ignore lint/suspicious/noExplicitAny: Connector config structure varies
			const config = connector.config as any;
			const githubPat = config?.GITHUB_PAT;
			const repoFullNamesToIndex = config?.repo_full_names;

			if (!githubPat) {
				await taskLogger.logTaskFailure(
					logEntry,
					`GitHub Personal Access Token (PAT) not found in connector config for connector ${connectorId}`,
					"Missing GitHub PAT",
					{ error_type: "MissingToken" },
				);
				throw new Error(
					"GitHub Personal Access Token (PAT) not found in connector config",
				);
			}

			if (!repoFullNamesToIndex || !Array.isArray(repoFullNamesToIndex)) {
				await taskLogger.logTaskFailure(
					logEntry,
					`'repo_full_names' not found or is not a list in connector config for connector ${connectorId}`,
					"Invalid repo configuration",
					{ error_type: "InvalidConfiguration" },
				);
				throw new Error(
					"'repo_full_names' not found or is not a list in connector config",
				);
			}

			// Initialize GitHub connector client
			await taskLogger.logTaskProgress(
				logEntry,
				`Initializing GitHub client for connector ${connectorId}`,
				{
					stage: "client_initialization",
					repo_count: repoFullNamesToIndex.length,
				},
			);

			let githubClient: GitHubConnector;
			try {
				githubClient = new GitHubConnector(githubPat);
			} catch (error) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Failed to initialize GitHub client for connector ${connectorId}`,
					error.message,
					{ error_type: "ClientInitializationError" },
				);
				throw new Error(`Failed to initialize GitHub client: ${error.message}`);
			}

			// Start indexing
			await taskLogger.logTaskProgress(
				logEntry,
				`Starting indexing for ${repoFullNamesToIndex.length} selected repositories`,
				{
					stage: "repo_processing",
					repo_count: repoFullNamesToIndex.length,
					start_date: startDate,
					end_date: endDate,
				},
			);

			this.logger.log(
				`Starting indexing for ${repoFullNamesToIndex.length} selected repositories.`,
			);
			if (startDate && endDate) {
				this.logger.log(
					`Date range requested: ${startDate} to ${endDate} (Note: GitHub indexing processes all files regardless of dates)`,
				);
			}

			// Iterate through selected repositories and index files
			for (const repoFullName of repoFullNamesToIndex) {
				if (!repoFullName || typeof repoFullName !== "string") {
					this.logger.warn(
						`Skipping invalid repository entry: ${repoFullName}`,
					);
					continue;
				}

				this.logger.log(`Processing repository: ${repoFullName}`);
				try {
					const filesToIndex =
						await githubClient.getRepositoryFiles(repoFullName);
					if (!filesToIndex || filesToIndex.length === 0) {
						this.logger.log(
							`No indexable files found in repository: ${repoFullName}`,
						);
						continue;
					}

					this.logger.log(
						`Found ${filesToIndex.length} files to process in ${repoFullName}`,
					);

					for (const fileInfo of filesToIndex) {
						const filePath = fileInfo.path;
						const fileUrl = fileInfo.url;
						const fileSha = fileInfo.sha;
						const fileType = fileInfo.type; // 'code' or 'doc'
						const fullPathKey = `${repoFullName}/${filePath}`;

						if (!filePath || !fileUrl || !fileSha) {
							this.logger.warn(
								`Skipping file with missing info in ${repoFullName}: ${JSON.stringify(fileInfo)}`,
							);
							continue;
						}

						// Get file content
						const fileContent = await githubClient.getFileContent(
							repoFullName,
							filePath,
						);

						if (fileContent === null) {
							this.logger.warn(
								`Could not retrieve content for ${fullPathKey}. Skipping.`,
							);
							continue;
						}

						// Generate unique identifier hash for this GitHub file
						const uniqueIdentifierHash = generateUniqueIdentifierHash(
							DocumentType.GITHUB_CONNECTOR,
							fileSha,
							searchSpaceId,
						);

						// Generate content hash
						const contentHash = generateContentHash(
							fileContent,
							searchSpaceId,
							fileSha,
						); // Check if document with this unique identifier already exists
						const existingDocument =
							await this.baseService.checkDocumentByUniqueIdentifier(
								uniqueIdentifierHash,
							);

						if (existingDocument) {
							// Document exists - check if content has changed
							if (existingDocument.contentHash === contentHash) {
								this.logger.log(
									`Document for GitHub file ${fullPathKey} unchanged. Skipping.`,
								);
								continue;
							} else {
								// Content has changed - update the existing document
								this.logger.log(
									`Content changed for GitHub file ${fullPathKey}. Updating document.`,
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
										file_path: filePath,
										file_sha: fileSha,
										file_url: fileUrl,
										repository: repoFullName,
										document_type: "GitHub File",
										connector_type: "GitHub",
									};

									const summary = await generateDocumentSummary(
										fileContent,
										userLlm,
										this.embeddingService,
										documentMetadata,
									);
									summaryContent = summary.summaryContent;
									summaryEmbedding = summary.summaryEmbedding;
								} else {
									// Fallback to simple summary if no LLM configured
									summaryContent = `GitHub File: ${fullPathKey}\n\n`;
									summaryContent += `Repository: ${repoFullName}\n`;
									summaryEmbedding =
										await this.embeddingService.embed(summaryContent);
								}

								// Generate new chunks from raw content
								const chunks = await this.createDocumentChunks(fileContent);

								// Delete old chunks first
								await this.prisma.chunk.deleteMany({
									where: { documentId: existingDocument.id },
								});

								// Update document with summary
								await this.prisma.document.update({
									where: { id: existingDocument.id },
									data: {
										title: `GitHub - ${fullPathKey}`,
										content: summaryContent,
										contentHash: contentHash,
										documentMetadata: {
											file_path: filePath,
											file_sha: fileSha,
											file_url: fileUrl,
											repository: repoFullName,
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
									`Successfully updated GitHub file ${fullPathKey}`,
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
								file_path: filePath,
								file_sha: fileSha,
								file_url: fileUrl,
								repository: repoFullName,
								document_type: "GitHub File",
								connector_type: "GitHub",
							};

							const summary = await generateDocumentSummary(
								fileContent,
								userLlm,
								this.embeddingService,
								documentMetadata,
							);
							summaryContent = summary.summaryContent;
							summaryEmbedding = summary.summaryEmbedding;
						} else {
							// Fallback to simple summary if no LLM configured
							summaryContent = `GitHub File: ${fullPathKey}\n\n`;
							summaryContent += `Repository: ${repoFullName}\n`;
							summaryEmbedding =
								await this.embeddingService.embed(summaryContent);
						}

						// Process chunks from raw content
						const chunks = await this.createDocumentChunks(fileContent);

						// Create document with summary
						const document = await this.prisma.document.create({
							data: {
								searchSpaceId,
								title: `GitHub - ${filePath}`,
								documentType: DocumentType.GITHUB_CONNECTOR,
								documentMetadata: {
									repository_full_name: repoFullName,
									file_path: filePath,
									full_path: fullPathKey,
									url: fileUrl,
									sha: fileSha,
									type: fileType,
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
						this.logger.log(
							`Successfully indexed new GitHub file: ${fullPathKey}`,
						);
					}
				} catch (error) {
					this.logger.error(
						`Failed to process repository ${repoFullName}: ${error.message}`,
						error.stack,
					);
					errors.push(`Failed processing ${repoFullName}: ${error.message}`);
				}
			}

			// Update the last_indexed_at timestamp for the connector
			if (documentsProcessed > 0) {
				await this.baseService.updateConnectorLastIndexed(connector);
			}

			this.logger.log(
				`Finished GitHub indexing for connector ${connectorId}. Processed ${documentsProcessed} files.`,
			);

			// Log success
			await taskLogger.logTaskSuccess(
				logEntry,
				`Successfully completed GitHub indexing for connector ${connectorId}`,
				{
					documents_processed: documentsProcessed,
					errors_count: errors.length,
					repo_count: repoFullNamesToIndex.length,
				},
			);
		} catch (error) {
			await taskLogger.logTaskFailure(
				logEntry,
				`Failed to index GitHub repos for connector ${connectorId}`,
				error.message,
				{ error_type: error.constructor.name },
			);
			this.logger.error(
				`Failed to index GitHub repos: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}
