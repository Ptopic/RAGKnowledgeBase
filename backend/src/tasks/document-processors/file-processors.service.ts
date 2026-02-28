/**
 * File document processors for different ETL services (Unstructured, LlamaCloud, Docling).
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { Document, DocumentType, Log } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SUMMARY_PROMPT_TEMPLATE } from "../../prompts";
import { EmbeddingService } from "../../retriever/embedding.service";
import { DeepgramService } from "../../services/deepgram.service";
import { DoclingService } from "../../services/docling.service";
import { LlamaCloudService } from "../../services/llamacloud.service";
import { TaskLoggingService } from "../../services/task-logging.service";
import { optimizeContentForContextWindow } from "../../utils/document-converters";
import { normalizeMarkdownForChunking } from "../../utils/markdown-normalizer";
import { DocumentProcessorBaseService } from "./base.service";
import { MarkdownProcessorService } from "./markdown-processor.service";

interface LangChainDocument {
	pageContent: string;
	// biome-ignore lint/suspicious/noExplicitAny: LangChain types use any
	metadata: Record<string, any>;
}

@Injectable()
export class FileProcessorsService {
	private readonly logger = new Logger(FileProcessorsService.name);
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor(
		private prisma: PrismaService,
		private baseService: DocumentProcessorBaseService,
		private markdownProcessor: MarkdownProcessorService,
		private embeddingService: EmbeddingService,
		private doclingService: DoclingService,
		private llamaCloudService: LlamaCloudService,
		private deepgramService: DeepgramService,
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
		const normalizedContent = normalizeMarkdownForChunking(content);
		const chunks = await this.textSplitter.splitText(normalizedContent);

		return Promise.all(
			chunks.map(async (chunkText) => {
				const normalizedChunk = normalizeMarkdownForChunking(chunkText);
				const embedding = await this.embeddingService.embed(normalizedChunk);
				return {
					content: normalizedChunk,
					embedding,
				};
			}),
		);
	}

	/**
	 * Generate document summary with metadata using AI (GPT-4o).
	 * Uses the same approach as the Python backend for consistency.
	 */
	private async generateDocumentSummary(
		content: string,
		// biome-ignore lint/suspicious/noExplicitAny: Metadata can have any shape
		metadata: Record<string, any>,
	): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
		try {
			// Always use GPT-4o for document summaries (high quality, large context window)
			const modelName = "gpt-4o";
			const llm = new ChatOpenAI({
				modelName,
				temperature: 0.3, // Slightly creative but mostly factual
				openAIApiKey: process.env.OPENAI_API_KEY,
			});

			// Optimize content to fit within context window
			const optimizedContent = optimizeContentForContextWindow(
				content,
				metadata,
				modelName,
			);

			// Prepare document with metadata for LLM
			const contentWithMetadata = `<DOCUMENT><DOCUMENT_METADATA>\n\n${JSON.stringify(metadata, null, 2)}\n\n</DOCUMENT_METADATA>\n\n<DOCUMENT_CONTENT>\n\n${optimizedContent}\n\n</DOCUMENT_CONTENT></DOCUMENT>`;

			// Generate summary using LLM
			this.logger.log(
				`Generating AI summary for document with ${optimizedContent.length} characters`,
			);
			const summaryChain = SUMMARY_PROMPT_TEMPLATE.pipe(llm);
			const summaryResult = await summaryChain.invoke({
				document: contentWithMetadata,
			});

			// Extract summary content from result
			const summaryContent =
				typeof summaryResult === "string"
					? summaryResult
					: (summaryResult as { content?: string }).content ||
						String(summaryResult);

			// Enhance summary with metadata section
			const metadataParts = ["# DOCUMENT METADATA"];

			for (const [key, value] of Object.entries(metadata)) {
				if (value) {
					const formattedKey = key
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase());
					metadataParts.push(`**${formattedKey}:** ${value}`);
				}
			}

			const metadataSection = metadataParts.join("\n");
			const enhancedSummaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${summaryContent}`;

			// Generate embedding for the enhanced summary
			this.logger.log("Generating embedding for document summary");
			const summaryEmbedding = await this.embeddingService.embed(
				enhancedSummaryContent,
			);

			return { summaryContent: enhancedSummaryContent, summaryEmbedding };
		} catch (error) {
			this.logger.error(
				`Failed to generate AI summary, falling back to simple summary: ${error.message}`,
			);

			// Fallback to simple summary if AI generation fails
			const metadataParts: string[] = ["# DOCUMENT METADATA"];

			for (const [key, value] of Object.entries(metadata)) {
				if (value) {
					const formattedKey = key
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase());
					metadataParts.push(`**${formattedKey}:** ${value}`);
				}
			}

			const metadataSection = metadataParts.join("\n");
			const summaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${content.substring(0, 5000)}`;

			// Generate embedding for the fallback summary
			const summaryEmbedding =
				await this.embeddingService.embed(summaryContent);

			return { summaryContent, summaryEmbedding };
		}
	}

	/**
	 * Process and store document content parsed by LlamaCloud.
	 */
	async addReceivedFileDocumentUsingLlamacloud(
		fileName: string,
		llamacloudMarkdownDocument: string,
		searchSpaceId: number,
		_userId: string, // Reserved for future LLM service integration
	): Promise<Document | null> {
		try {
			const fileInMarkdown = llamacloudMarkdownDocument;

			// Generate unique identifier hash for this file
			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.FILE,
				fileName,
				searchSpaceId,
			);

			// Generate content hash
			const contentHash = this.generateContentHash(
				fileInMarkdown,
				searchSpaceId,
			);

			// Check if document with this unique identifier already exists
			const existingDocument =
				await this.baseService.checkDocumentByUniqueIdentifier(
					uniqueIdentifierHash,
				);

			if (existingDocument) {
				// Document exists - check if content has changed
				if (existingDocument.contentHash === contentHash) {
					this.logger.log(`Document for file ${fileName} unchanged. Skipping.`);
					return existingDocument;
				} else {
					// Content has changed - update the existing document
					this.logger.log(
						`Content changed for file ${fileName}. Updating document.`,
					);
				}
			}

			// Generate summary with metadata
			const documentMetadata = {
				file_name: fileName,
				etl_service: "LLAMACLOUD",
				document_type: "File Document",
			};

			const { summaryContent, summaryEmbedding } =
				await this.generateDocumentSummary(fileInMarkdown, documentMetadata);

			// Process chunks
			const chunks = await this.createDocumentChunks(fileInMarkdown);

			// Update or create document
			if (existingDocument) {
				// Delete old chunks first
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				// Update existing document
				const updatedDocument = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: fileName,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: "LLAMACLOUD",
						} as any,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(
					updatedDocument.id,
					summaryEmbedding,
				);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);

				return updatedDocument;
			} else {
				// Create new document
				const document = await this.prisma.document.create({
					data: {
						searchSpaceId,
						title: fileName,
						documentType: DocumentType.FILE,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: "LLAMACLOUD",
						} as any,
						content: summaryContent,
						contentHash,
						uniqueIdentifierHash,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(document.id, summaryEmbedding);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(document.id, chunks);

				return document;
			}
		} catch (error) {
			this.logger.error(
				`Failed to process file document using LlamaCloud: ${error.message}`,
				error.stack,
			);
			throw new Error(
				`Failed to process file document using LlamaCloud: ${error.message}`,
			);
		}
	}

	/**
	 * Process and store document content parsed by an ETL service (Docling, LlamaCloud, etc.).
	 */
	async addReceivedFileDocumentUsingEtl(
		fileName: string,
		markdownDocument: string,
		searchSpaceId: number,
		_userId: string, // Reserved for future LLM service integration
		etlService = "DOCLING",
	): Promise<Document | null> {
		try {
			const fileInMarkdown = markdownDocument;

			// Generate unique identifier hash for this file
			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.FILE,
				fileName,
				searchSpaceId,
			);

			// Generate content hash
			const contentHash = this.generateContentHash(
				fileInMarkdown,
				searchSpaceId,
			);

			// Check if document with this unique identifier already exists
			const existingDocument =
				await this.baseService.checkDocumentByUniqueIdentifier(
					uniqueIdentifierHash,
				);

			if (existingDocument) {
				// Document exists - check if content has changed
				if (existingDocument.contentHash === contentHash) {
					this.logger.log(`Document for file ${fileName} unchanged. Skipping.`);
					return existingDocument;
				} else {
					// Content has changed - update the existing document
					this.logger.log(
						`Content changed for file ${fileName}. Updating document.`,
					);
				}
			}

			// Generate summary with metadata
			const documentMetadata = {
				file_name: fileName,
				etl_service: etlService.toUpperCase(),
				document_type: "File Document",
			};

			const { summaryContent, summaryEmbedding } =
				await this.generateDocumentSummary(fileInMarkdown, documentMetadata);

			// Process chunks
			const chunks = await this.createDocumentChunks(fileInMarkdown);

			// Update or create document
			if (existingDocument) {
				// Delete old chunks first
				await this.prisma.chunk.deleteMany({
					where: { documentId: existingDocument.id },
				});

				// Update existing document
				const updatedDocument = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: fileName,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: etlService.toUpperCase(),
						} as any,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(
					updatedDocument.id,
					summaryEmbedding,
				);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(updatedDocument.id, chunks);

				return updatedDocument;
			} else {
				// Create new document
				const document = await this.prisma.document.create({
					data: {
						searchSpaceId,
						title: fileName,
						documentType: DocumentType.FILE,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: etlService.toUpperCase(),
						} as any,
						content: summaryContent,
						contentHash,
						uniqueIdentifierHash,
					},
					include: { chunks: true },
				});

				// Update document embedding using raw SQL
				await this.updateDocumentEmbedding(document.id, summaryEmbedding);

				// Insert chunks with embeddings using raw SQL
				await this.insertChunksWithEmbeddings(document.id, chunks);

				return document;
			}
		} catch (error) {
			this.logger.error(
				`Failed to process file document using Docling: ${error.message}`,
				error.stack,
			);
			throw new Error(
				`Failed to process file document using Docling: ${error.message}`,
			);
		}
	}

	/**
	 * Process file in background based on file type.
	 */
	async processFileInBackground(
		filePath: string,
		filename: string,
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		const taskLogger = TaskLoggingService.forSearchSpace(
			this.prisma,
			searchSpaceId,
		);

		let logEntry: Log | null = null;

		try {
			// Log task start
			logEntry = await taskLogger.logTaskStart(
				"file_upload_processing",
				"background_task",
				`Starting file processing for: ${filename}`,
				{ filename, user_id: userId, file_path: filePath },
			);

			// Check if the file is a markdown or text file
			if (filename.toLowerCase().match(/\.(md|markdown|txt)$/)) {
				await taskLogger.logTaskProgress(
					logEntry,
					`Processing markdown/text file: ${filename}`,
					{ file_type: "markdown", processing_stage: "reading_file" },
				);

				// For markdown files, read the content directly
				const markdownContent = fs.readFileSync(filePath, "utf-8");

				// Clean up the temp file
				try {
					fs.unlinkSync(filePath);
				} catch (e) {
					this.logger.error("Error deleting temp file", e);
				}

				await taskLogger.logTaskProgress(
					logEntry,
					`Creating document from markdown content: ${filename}`,
					{
						processing_stage: "creating_document",
						content_length: markdownContent.length,
					},
				);

				// Process markdown directly through specialized function
				const result =
					await this.markdownProcessor.addReceivedMarkdownFileDocument(
						filename,
						markdownContent,
						searchSpaceId,
						userId,
					);

				if (result) {
					await taskLogger.logTaskSuccess(
						logEntry,
						`Successfully processed markdown file: ${filename}`,
						{
							document_id: result.id,
							content_hash: result.contentHash,
							file_type: "markdown",
						},
					);
				} else {
					await taskLogger.logTaskSuccess(
						logEntry,
						`Markdown file already exists (duplicate): ${filename}`,
						{ duplicate_detected: true, file_type: "markdown" },
					);
				}
			}
			// Check if the file is an audio file
			else if (
				filename.toLowerCase().match(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/)
			) {
				await taskLogger.logTaskProgress(
					logEntry,
					`Processing audio file for transcription: ${filename}`,
					{ file_type: "audio", processing_stage: "starting_transcription" },
				);

				try {
					// Check if Deepgram is available
					if (!this.deepgramService.isAvailable()) {
						throw new Error(
							"Deepgram STT service is not available. Please configure DEEPGRAM_API_KEY.",
						);
					}

					// Transcribe audio file
					await taskLogger.logTaskProgress(
						logEntry,
						`Transcribing audio with Deepgram: ${filename}`,
						{
							processing_stage: "transcribing",
							service: "deepgram",
						},
					);

					const transcription =
						await this.deepgramService.transcribeFile(filePath);

					// Clean up the temp file
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						this.logger.error("Error deleting temp file", e);
					}

					// Create document from transcript
					await taskLogger.logTaskProgress(
						logEntry,
						`Creating document from transcript: ${filename}`,
						{
							processing_stage: "creating_document",
							transcript_length: transcription.text.length,
							duration: transcription.duration,
						},
					);

					// Process transcript as markdown
					const result =
						await this.markdownProcessor.addReceivedMarkdownFileDocument(
							filename,
							transcription.text,
							searchSpaceId,
							userId,
						);

					if (result) {
						await taskLogger.logTaskSuccess(
							logEntry,
							`Successfully processed audio file: ${filename}`,
							{
								document_id: result.id,
								content_hash: result.contentHash,
								file_type: "audio",
								duration: transcription.duration,
								language: transcription.language,
							},
						);
					}
				} catch (error) {
					// Clean up the temp file on error
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						this.logger.error("Error deleting temp file", e);
					}

					await taskLogger.logTaskFailure(
						logEntry,
						`Failed to process audio file: ${filename}`,
						error.message,
						{ error_type: error.name, file_type: "audio" },
					);
				}
			} else {
				await taskLogger.logTaskProgress(
					logEntry,
					`Processing document file: ${filename}`,
					{ file_type: "document", processing_stage: "etl_processing" },
				);

				try {
					// Determine which ETL service to use
					const etlService =
						process.env.ETL_SERVICE?.toUpperCase() || "DOCLING";
					let markdown = "";
					let metadata: any = {};
					let serviceName = "";

					if (etlService === "LLAMACLOUD") {
						// Use LlamaCloud for processing
						const isLlamaCloudAvailable =
							await this.llamaCloudService.isAvailable();
						const isFileSupported =
							this.llamaCloudService.isFileTypeSupported(filename);

						if (!isLlamaCloudAvailable) {
							throw new Error(
								"LlamaCloud service is not available. Please set LLAMA_CLOUD_API_KEY.",
							);
						}

						if (!isFileSupported) {
							throw new Error(
								`File type not supported by LlamaCloud: ${filename}. Supported types: ${this.llamaCloudService.getSupportedFileTypes().join(", ")}`,
							);
						}

						await taskLogger.logTaskProgress(
							logEntry,
							`Processing document with LlamaCloud: ${filename}`,
							{
								processing_stage: "llamacloud_conversion",
								service: "llamacloud",
							},
						);

						const llamaResult =
							await this.llamaCloudService.processDocumentFromPath(filePath);

						markdown = llamaResult.markdown;
						metadata = llamaResult.metadata || {};
						serviceName = "llamacloud";
					} else if (etlService === "DOCLING") {
						// Use Docling for processing (default)
						const isDoclingAvailable = await this.doclingService.isAvailable();
						const isFileSupported =
							this.doclingService.isFileTypeSupported(filename);

						if (!isDoclingAvailable) {
							throw new Error(
								"Docling service is not available. Please ensure Docling is running.",
							);
						}

						if (!isFileSupported) {
							throw new Error(
								`File type not supported by Docling: ${filename}. Supported types: ${this.doclingService.getSupportedFileTypes().join(", ")}`,
							);
						}

						await taskLogger.logTaskProgress(
							logEntry,
							`Processing document with Docling: ${filename}`,
							{
								processing_stage: "docling_conversion",
								service: "docling",
							},
						);

						const doclingResult =
							await this.doclingService.processDocumentFromPath(filePath);

						markdown = doclingResult.markdown;
						metadata = doclingResult.metadata || {};
						serviceName = "docling";
					} else {
						throw new Error(
							`Unsupported ETL service: ${etlService}. Supported: DOCLING, LLAMACLOUD`,
						);
					}

					// Clean up the temp file
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						this.logger.error("Error deleting temp file", e);
					}

					// Create document from markdown
					await taskLogger.logTaskProgress(
						logEntry,
						`Creating document from ${serviceName} output: ${filename}`,
						{
							processing_stage: "creating_document",
							markdown_length: markdown.length,
							page_count: metadata?.pages || metadata?.page_count,
						},
					);

					const result = await this.addReceivedFileDocumentUsingEtl(
						filename,
						markdown,
						searchSpaceId,
						userId,
						serviceName,
					);

					if (result) {
						await taskLogger.logTaskSuccess(
							logEntry,
							`Successfully processed document file: ${filename}`,
							{
								document_id: result.id,
								content_hash: result.contentHash,
								file_type: "document",
								etl_service: serviceName,
								page_count: metadata?.pages || metadata?.page_count,
							},
						);
					}
				} catch (error) {
					// Clean up the temp file on error
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						this.logger.error("Error deleting temp file", e);
					}

					await taskLogger.logTaskFailure(
						logEntry,
						`Failed to process document file: ${filename}`,
						error.message,
						{ error_type: error.name, file_type: "document" },
					);
				}
			}
		} catch (error) {
			if (logEntry) {
				await taskLogger.logTaskFailure(
					logEntry,
					`Error processing file: ${filename}`,
					error.message,
					{ error_type: error.name, filename },
				);
			}

			this.logger.error(
				`Error processing file in background: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	private generateUniqueIdentifierHash(
		documentType: DocumentType,
		identifier: string,
		searchSpaceId: number,
	): string {
		const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}

	private generateContentHash(content: string, searchSpaceId: number): string {
		const hashInput = `${content}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}

	/**
	 * Helper method to insert chunks with embeddings using raw SQL.
	 * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
	 */
	private async insertChunksWithEmbeddings(
		documentId: number,
		chunks: { content: string; embedding: number[] }[],
	): Promise<void> {
		for (const chunk of chunks) {
			// Convert embedding array to PostgreSQL vector format
			const vectorString = `[${chunk.embedding.join(",")}]`;

			await this.prisma.$executeRawUnsafe(
				`INSERT INTO chunks (content, embedding, document_id, created_at) 
				 VALUES ($1, $2::vector, $3, NOW())`,
				chunk.content,
				vectorString,
				documentId,
			);
		}
	}

	/**
	 * Helper method to update document embedding using raw SQL.
	 * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
	 */
	private async updateDocumentEmbedding(
		documentId: number,
		embedding: number[],
	): Promise<void> {
		// Convert embedding array to PostgreSQL vector format
		const vectorString = `[${embedding.join(",")}]`;

		await this.prisma.$executeRawUnsafe(
			`UPDATE documents SET embedding = $1::vector WHERE id = $2`,
			vectorString,
			documentId,
		);
	}
}
