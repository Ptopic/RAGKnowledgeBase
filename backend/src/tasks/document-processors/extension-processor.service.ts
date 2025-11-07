/**
 * Extension document processor for SurfSense browser extension.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';
import { DocumentProcessorBaseService } from './base.service';

interface ExtensionDocumentMetadata {
  BrowsingSessionId: string;
  VisitedWebPageURL: string;
  VisitedWebPageTitle: string;
  VisitedWebPageReffererURL: string;
  VisitedWebPageDateWithTimeInISOString: string;
  VisitedWebPageVisitDurationInMilliseconds: number;
}

interface ExtensionDocumentContent {
  metadata: ExtensionDocumentMetadata;
  pageContent: string;
}

@Injectable()
export class ExtensionProcessorService {
  private readonly logger = new Logger(ExtensionProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
  ) {}

  /**
   * Process and store document content received from the SurfSense Extension.
   *
   * @param content - Document content from extension
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @returns Document object if successful, null if failed
   */
  async addExtensionReceivedDocument(
    content: ExtensionDocumentContent,
    searchSpaceId: number,
    userId: string,
  ): Promise<Document | null> {
    try {
      // Format document metadata in a more maintainable way
      const metadataSections: [string, string[]][] = [
        [
          'METADATA',
          [
            `SESSION_ID: ${content.metadata.BrowsingSessionId}`,
            `URL: ${content.metadata.VisitedWebPageURL}`,
            `TITLE: ${content.metadata.VisitedWebPageTitle}`,
            `REFERRER: ${content.metadata.VisitedWebPageReffererURL}`,
            `TIMESTAMP: ${content.metadata.VisitedWebPageDateWithTimeInISOString}`,
            `DURATION_MS: ${content.metadata.VisitedWebPageVisitDurationInMilliseconds}`,
          ],
        ],
        [
          'CONTENT',
          ['FORMAT: markdown', 'TEXT_START', content.pageContent, 'TEXT_END'],
        ],
      ];

      // Build the document string more efficiently
      const documentParts: string[] = [];
      documentParts.push('<DOCUMENT>');

      for (const [sectionTitle, sectionContent] of metadataSections) {
        documentParts.push(`<${sectionTitle}>`);
        documentParts.push(...sectionContent);
        documentParts.push(`</${sectionTitle}>`);
      }

      documentParts.push('</DOCUMENT>');
      const combinedDocumentString = documentParts.join('\n');

      // Generate unique identifier hash for this extension document (using URL)
      const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
        DocumentType.EXTENSION,
        content.metadata.VisitedWebPageURL,
        searchSpaceId,
      );

      // Generate content hash
      const contentHash = this.generateContentHash(
        combinedDocumentString,
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
            `Document for URL ${content.metadata.VisitedWebPageURL} unchanged. Skipping.`,
          );
          return existingDocument;
        } else {
          // Content has changed - update the existing document
          this.logger.log(
            `Content changed for URL ${content.metadata.VisitedWebPageURL}. Updating document.`,
          );
        }
      }

      // Get user's long context LLM (needed for both create and update)
      // Note: This would require integration with your LLM service
      // const userLlm = await this.llmService.getUserLongContextLlm(userId, searchSpaceId);

      // Generate summary with metadata
      const documentMetadata = {
        session_id: content.metadata.BrowsingSessionId,
        url: content.metadata.VisitedWebPageURL,
        title: content.metadata.VisitedWebPageTitle,
        referrer: content.metadata.VisitedWebPageReffererURL,
        timestamp: content.metadata.VisitedWebPageDateWithTimeInISOString,
        duration_ms:
          content.metadata.VisitedWebPageVisitDurationInMilliseconds,
        document_type: 'Browser Extension Capture',
      };

      // Note: Summary generation and embedding creation would be done here
      // const { summaryContent, summaryEmbedding } = await this.generateDocumentSummary(
      //   combinedDocumentString,
      //   userLlm,
      //   documentMetadata,
      // );

      // Process chunks
      // const chunks = await this.createDocumentChunks(content.pageContent);

      // For now, we'll use placeholder values
      const summaryContent = content.pageContent;
      const summaryEmbedding: number[] = [];

      // Update or create document
      if (existingDocument) {
        // Update existing document
        const updatedDocument = await this.prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            title: content.metadata.VisitedWebPageTitle,
            content: summaryContent,
            contentHash,
            documentMetadata: content.metadata as any,
          },
        });
        return updatedDocument;
      } else {
        // Create new document
        const document = await this.prisma.document.create({
          data: {
            searchSpaceId,
            title: content.metadata.VisitedWebPageTitle,
            documentType: DocumentType.EXTENSION,
            documentMetadata: content.metadata as any,
            content: summaryContent,
            contentHash,
            uniqueIdentifierHash,
          },
        });
        return document;
      }
    } catch (error) {
      this.logger.error(
        `Failed to process extension document: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to process extension document: ${error.message}`);
    }
  }

  private generateUniqueIdentifierHash(
    documentType: DocumentType,
    identifier: string,
    searchSpaceId: number,
  ): string {
    // Note: This should use a proper hashing function
    const crypto = require('crypto');
    const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private generateContentHash(content: string, searchSpaceId: number): string {
    // Note: This should use a proper hashing function
    const crypto = require('crypto');
    const hashInput = `${content}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }
}
