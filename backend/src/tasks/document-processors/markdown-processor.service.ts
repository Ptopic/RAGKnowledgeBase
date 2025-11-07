/**
 * Markdown file document processor.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';
import { DocumentProcessorBaseService } from './base.service';

@Injectable()
export class MarkdownProcessorService {
  private readonly logger = new Logger(MarkdownProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
  ) {}

  /**
   * Process and store a markdown file document.
   *
   * @param fileName - Name of the markdown file
   * @param fileInMarkdown - Content of the markdown file
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @returns Document object if successful, null if failed
   */
  async addReceivedMarkdownFileDocument(
    fileName: string,
    fileInMarkdown: string,
    searchSpaceId: number,
    userId: string,
  ): Promise<Document | null> {
    try {
      // Generate unique identifier hash for this markdown file
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
          this.logger.log(
            `Document for markdown file ${fileName} unchanged. Skipping.`,
          );
          return existingDocument;
        } else {
          // Content has changed - update the existing document
          this.logger.log(
            `Content changed for markdown file ${fileName}. Updating document.`,
          );
        }
      }

      // Note: LLM service integration would be done here
      const summaryContent = fileInMarkdown;
      const summaryEmbedding: number[] = [];

      // Process chunks would be done here
      // const chunks = await this.createDocumentChunks(fileInMarkdown);

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
        `Failed to process markdown file: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to process file document: ${error.message}`);
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
