/**
 * File document processors for different ETL services (Unstructured, LlamaCloud, Docling).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';
import { DocumentProcessorBaseService } from './base.service';
import { MarkdownProcessorService } from './markdown-processor.service';

@Injectable()
export class FileProcessorsService {
  private readonly logger = new Logger(FileProcessorsService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
    private markdownProcessor: MarkdownProcessorService,
  ) {}

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
      const fileInMarkdown = ''; // Placeholder

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
              ETL_SERVICE: 'UNSTRUCTURED',
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
              ETL_SERVICE: 'UNSTRUCTURED',
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
              ETL_SERVICE: 'LLAMACLOUD',
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
              ETL_SERVICE: 'LLAMACLOUD',
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
              ETL_SERVICE: 'DOCLING',
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
              ETL_SERVICE: 'DOCLING',
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
        const fs = require('fs');
        const markdownContent = fs.readFileSync(filePath, 'utf-8');

        // Clean up the temp file
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          this.logger.error('Error deleting temp file', e);
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
        // Process with ETL service (Unstructured, LlamaCloud, or Docling)
        this.logger.log(`Processing document file: ${filename}`);
      }
    } catch (error) {
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
    const crypto = require('crypto');
    const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private generateContentHash(content: string, searchSpaceId: number): string {
    const crypto = require('crypto');
    const hashInput = `${content}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }
}
