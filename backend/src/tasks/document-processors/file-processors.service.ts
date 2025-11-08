/**
 * File document processors for different ETL services (Unstructured, LlamaCloud, Docling).
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Injectable, Logger } from "@nestjs/common";
import { Document, DocumentType } from "@prisma/client";
import * as fs from "fs";
import * as pdfParse from "pdf-parse";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "../../retriever/embedding.service";
import { DocumentProcessorBaseService } from "./base.service";
import { MarkdownProcessorService } from "./markdown-processor.service";

@Injectable()
export class FileProcessorsService {
	private readonly logger = new Logger(FileProcessorsService.name);
	private textSplitter: RecursiveCharacterTextSplitter;

	constructor(
		private prisma: PrismaService,
		private baseService: DocumentProcessorBaseService,
		private markdownProcessor: MarkdownProcessorService,
		private embeddingService: EmbeddingService,
	) {
		// Initialize text splitter with reasonable defaults
		this.textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	}

	/**
	 * Process and store a file document using Unstructured service.
	 *
	 * @param fileName - Name of the processed file
	 * @param unstructuredProcessedElements - Processed elements from Unstructured
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @returns Document object if successful, null if failed
	 */
	async addReceivedFileDocumentUsingUnstructured(
		fileName: string,
		unstructuredProcessedElements: any[],
		searchSpaceId: number,
		userId: string,
	): Promise<Document | null> {
		try {
			// Note: Convert document to markdown would be done here
			const fileInMarkdown = ""; // Placeholder

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

			// Note: LLM service integration would be done here
			const summaryContent = fileInMarkdown;
			const summaryEmbedding: number[] = [];

			// Update or create document
			if (existingDocument) {
				// Update existing document
				const updatedDocument = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: fileName,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: "UNSTRUCTURED",
						} as any,
					},
				});
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
							ETL_SERVICE: "UNSTRUCTURED",
						} as any,
						content: summaryContent,
						contentHash,
						uniqueIdentifierHash,
					},
				});
				return document;
			}
		} catch (error) {
			this.logger.error(
				`Failed to process file document: ${error.message}`,
				error.stack,
			);
			throw new Error(`Failed to process file document: ${error.message}`);
		}
	}

	/**
	 * Process and store document content parsed by LlamaCloud.
	 *
	 * @param fileName - Name of the processed file
	 * @param llamacloudMarkdownDocument - Markdown content from LlamaCloud parsing
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @returns Document object if successful, null if failed
	 */
	async addReceivedFileDocumentUsingLlamacloud(
		fileName: string,
		llamacloudMarkdownDocument: string,
		searchSpaceId: number,
		userId: string,
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

			// Note: LLM service integration would be done here
			const summaryContent = fileInMarkdown;
			const summaryEmbedding: number[] = [];

			// Update or create document
			if (existingDocument) {
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
				});
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
				});
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
	 * Process and store document content parsed by Docling.
	 *
	 * @param fileName - Name of the processed file
	 * @param doclingMarkdownDocument - Markdown content from Docling parsing
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 * @returns Document object if successful, null if failed
	 */
	async addReceivedFileDocumentUsingDocling(
		fileName: string,
		doclingMarkdownDocument: string,
		searchSpaceId: number,
		userId: string,
	): Promise<Document | null> {
		try {
			const fileInMarkdown = doclingMarkdownDocument;

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

			// Note: LLM service integration would be done here
			const summaryContent = fileInMarkdown;
			const summaryEmbedding: number[] = [];

			// Update or create document
			if (existingDocument) {
				// Update existing document
				const updatedDocument = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: fileName,
						content: summaryContent,
						contentHash,
						documentMetadata: {
							FILE_NAME: fileName,
							ETL_SERVICE: "DOCLING",
						} as any,
					},
				});
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
							ETL_SERVICE: "DOCLING",
						} as any,
						content: summaryContent,
						contentHash,
						uniqueIdentifierHash,
					},
				});
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
	 *
	 * @param filePath - Path to the uploaded file
	 * @param filename - Original filename
	 * @param searchSpaceId - ID of the search space
	 * @param userId - ID of the user
	 */
	async processFileInBackground(
		filePath: string,
		filename: string,
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		try {
			// Check if the file is a markdown or text file
			if (filename.toLowerCase().match(/\.(md|markdown|txt)$/)) {
				const fs = require("fs");
				const markdownContent = fs.readFileSync(filePath, "utf-8");

				// Clean up the temp file
				try {
					fs.unlinkSync(filePath);
				} catch (e) {
					this.logger.error("Error deleting temp file", e);
				}

				// Process markdown directly through specialized function
				await this.markdownProcessor.addReceivedMarkdownFileDocument(
					filename,
					markdownContent,
					searchSpaceId,
					userId,
				);
			}
			// Check if the file is an audio file
			else if (
				filename.toLowerCase().match(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/)
			) {
				// Note: Audio transcription would be done here
				this.logger.log(`Processing audio file: ${filename}`);
			} else {
				// Process PDF and other document files
				this.logger.log(`Processing document file: ${filename}`);
				await this.processPdfDocument(
					filePath,
					filename,
					searchSpaceId,
					userId,
				);
			}
		} catch (error) {
			this.logger.error(
				`Error processing file in background: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Process PDF document with chunking and embeddings
	 */
	private async processPdfDocument(
		filePath: string,
		filename: string,
		searchSpaceId: number,
		userId: string,
	): Promise<Document | null> {
		try {
			this.logger.log(`Parsing PDF: ${filename}`);

			// Read and parse PDF
			const dataBuffer = fs.readFileSync(filePath);
			const pdfData = await pdfParse(dataBuffer);
			const textContent = pdfData.text;

			// Clean up the temp file
			try {
				fs.unlinkSync(filePath);
			} catch (e) {
				this.logger.error("Error deleting temp file", e);
			}

			if (!textContent || textContent.trim().length === 0) {
				this.logger.warn(`No text content extracted from PDF: ${filename}`);
				throw new Error("No text content extracted from PDF");
			}

			this.logger.log(
				`Extracted ${textContent.length} characters from ${filename}`,
			);

			// Generate unique identifier hash for this file
			const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
				DocumentType.FILE,
				filename,
				searchSpaceId,
			);

			// Generate content hash
			const contentHash = this.generateContentHash(textContent, searchSpaceId);

			// Check if document with this unique identifier already exists
			const existingDocument =
				await this.baseService.checkDocumentByUniqueIdentifier(
					uniqueIdentifierHash,
				);

			if (existingDocument) {
				// Document exists - check if content has changed
				if (existingDocument.contentHash === contentHash) {
					this.logger.log(`Document for file ${filename} unchanged. Skipping.`);
					return existingDocument;
				} else {
					// Content has changed - delete old chunks
					this.logger.log(
						`Content changed for file ${filename}. Updating document.`,
					);
					await this.prisma.chunk.deleteMany({
						where: { documentId: existingDocument.id },
					});
				}
			}

			// Split text into chunks
			this.logger.log(`Splitting text into chunks for ${filename}`);
			const chunks = await this.textSplitter.splitText(textContent);
			this.logger.log(`Created ${chunks.length} chunks for ${filename}`);

			// Create or update document
			let document: Document;
			if (existingDocument) {
				document = await this.prisma.document.update({
					where: { id: existingDocument.id },
					data: {
						title: filename,
						content: textContent.substring(0, 5000), // Store preview
						contentHash,
						documentMetadata: {
							FILE_NAME: filename,
							PAGE_COUNT: pdfData.numpages,
							CHUNK_COUNT: chunks.length,
						} as any,
					},
				});
			} else {
				document = await this.prisma.document.create({
					data: {
						searchSpaceId,
						title: filename,
						documentType: DocumentType.FILE,
						documentMetadata: {
							FILE_NAME: filename,
							PAGE_COUNT: pdfData.numpages,
							CHUNK_COUNT: chunks.length,
						} as any,
						content: textContent.substring(0, 5000), // Store preview
						contentHash,
						uniqueIdentifierHash,
					},
				});
			}

			this.logger.log(`Document created/updated with ID: ${document.id}`);

			// Process chunks and generate embeddings
			this.logger.log(`Generating embeddings for ${chunks.length} chunks...`);
			for (let i = 0; i < chunks.length; i++) {
				const chunkText = chunks[i];

				try {
					// Generate embedding for the chunk
					const embedding = await this.embeddingService.embed(chunkText);

					// Store chunk with embedding using raw SQL (pgvector type)
					await this.prisma.$executeRaw`
						INSERT INTO "chunks" ("content", "embedding", "document_id", "created_at")
						VALUES (${chunkText}, ${JSON.stringify(embedding)}::vector, ${document.id}, NOW())
					`;

					if ((i + 1) % 10 === 0) {
						this.logger.log(
							`Processed ${i + 1}/${chunks.length} chunks for ${filename}`,
						);
					}
				} catch (error) {
					this.logger.error(
						`Failed to process chunk ${i} for ${filename}: ${error.message}`,
					);
					// Continue with next chunk
				}
			}

			this.logger.log(
				`Successfully processed ${filename} with ${chunks.length} chunks`,
			);
			return document;
		} catch (error) {
			this.logger.error(
				`Failed to process PDF document ${filename}: ${error.message}`,
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
		const crypto = require("crypto");
		const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}

	private generateContentHash(content: string, searchSpaceId: number): string {
		const crypto = require("crypto");
		const hashInput = `${content}-${searchSpaceId}`;
		return crypto.createHash("sha256").update(hashInput).digest("hex");
	}
}
