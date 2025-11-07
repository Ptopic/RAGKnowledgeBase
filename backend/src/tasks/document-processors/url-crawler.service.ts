/**
 * URL crawler document processor.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';
import { DocumentProcessorBaseService } from './base.service';
import * as validator from 'validator';

@Injectable()
export class UrlCrawlerService {
  private readonly logger = new Logger(UrlCrawlerService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
  ) {}

  /**
   * Process and store a document from a crawled URL.
   *
   * @param url - URL to crawl
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @returns Document object if successful, null if failed
   */
  async addCrawledUrlDocument(
    url: string,
    searchSpaceId: number,
    userId: string,
  ): Promise<Document | null> {
    try {
      // URL validation
      if (!validator.isURL(url)) {
        throw new Error(`URL ${url} is not a valid URL address`);
      }

      // Note: Actual crawling would be done here using FireCrawl or AsyncChromium
      // For now, we'll simulate the crawling process
      const crawledContent = {
        content: '',
        metadata: {
          title: url,
          source: url,
        },
      };

      const contentInMarkdown = crawledContent.content;

      // Format document metadata
      const metadataSections: [string, string[]][] = [
        [
          'METADATA',
          Object.entries(crawledContent.metadata).map(
            ([key, value]) => `${key.toUpperCase()}: ${value}`,
          ),
        ],
        [
          'CONTENT',
          ['FORMAT: markdown', 'TEXT_START', contentInMarkdown, 'TEXT_END'],
        ],
      ];

      // Build the document string
      const documentParts: string[] = [];
      documentParts.push('<DOCUMENT>');

      for (const [sectionTitle, sectionContent] of metadataSections) {
        documentParts.push(`<${sectionTitle}>`);
        documentParts.push(...sectionContent);
        documentParts.push(`</${sectionTitle}>`);
      }

      documentParts.push('</DOCUMENT>');
      const combinedDocumentString = documentParts.join('\n');

      // Generate unique identifier hash for this URL
      const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
        DocumentType.CRAWLED_URL,
        url,
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
          this.logger.log(`Document for URL ${url} unchanged. Skipping.`);
          return existingDocument;
        } else {
          // Content has changed - update the existing document
          this.logger.log(`Content changed for URL ${url}. Updating document.`);
        }
      }

      // Note: LLM service integration would be done here
      // const userLlm = await this.llmService.getUserLongContextLlm(userId, searchSpaceId);

      // Generate summary with metadata
      const documentMetadata = {
        url,
        title: crawledContent.metadata.title,
        document_type: 'Crawled URL Document',
      };

      // Note: Summary generation would be done here
      const summaryContent = contentInMarkdown;
      const summaryEmbedding: number[] = [];

      // Process chunks
      // const chunks = await this.createDocumentChunks(contentInMarkdown);

      // Update or create document
      if (existingDocument) {
        // Update existing document
        const updatedDocument = await this.prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            title: crawledContent.metadata.title,
            content: summaryContent,
            contentHash,
            embedding: summaryEmbedding,
            documentMetadata: crawledContent.metadata as any,
          },
        });
        return updatedDocument;
      } else {
        // Create new document
        const document = await this.prisma.document.create({
          data: {
            searchSpaceId,
            title: crawledContent.metadata.title,
            documentType: DocumentType.CRAWLED_URL,
            documentMetadata: crawledContent.metadata as any,
            content: summaryContent,
            embedding: summaryEmbedding,
            contentHash,
            uniqueIdentifierHash,
          },
        });
        return document;
      }
    } catch (error) {
      this.logger.error(
        `Failed to crawl URL: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to crawl URL: ${error.message}`);
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
