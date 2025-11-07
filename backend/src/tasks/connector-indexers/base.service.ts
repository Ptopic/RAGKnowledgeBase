/**
 * Base functionality and shared imports for connector indexers.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Document,
  SearchSourceConnector,
  SearchSourceConnectorType,
} from '@prisma/client';

@Injectable()
export class ConnectorIndexerBaseService {
  private readonly logger = new Logger(ConnectorIndexerBaseService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a document with the given content hash already exists.
   *
   * @param contentHash - Hash of the document content
   * @returns Existing document if found, null otherwise
   */
  async checkDuplicateDocumentByHash(
    contentHash: string,
  ): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { contentHash },
    });
  }

  /**
   * Check if a document with the given unique identifier hash already exists.
   * Eagerly loads chunks to avoid lazy loading issues during updates.
   *
   * @param uniqueIdentifierHash - Hash of the unique identifier from the source system
   * @returns Existing document if found, null otherwise
   */
  async checkDocumentByUniqueIdentifier(
    uniqueIdentifierHash: string,
  ): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { uniqueIdentifierHash },
      include: { chunks: true },
    });
  }

  /**
   * Get a connector by ID and type from the database.
   *
   * @param connectorId - ID of the connector
   * @param connectorType - Expected type of the connector
   * @returns Connector object if found, null otherwise
   */
  async getConnectorById(
    connectorId: number,
    connectorType: SearchSourceConnectorType,
  ): Promise<SearchSourceConnector | null> {
    return this.prisma.searchSourceConnector.findFirst({
      where: {
        id: connectorId,
        connectorType,
      },
    });
  }

  /**
   * Calculate date range for indexing based on provided dates or connector's last indexed date.
   *
   * @param connector - The connector object
   * @param startDate - Optional start date string (YYYY-MM-DD)
   * @param endDate - Optional end date string (YYYY-MM-DD)
   * @param defaultDaysBack - Default number of days to go back if no last indexed date
   * @returns Tuple of [startDateStr, endDateStr]
   */
  calculateDateRange(
    connector: SearchSourceConnector,
    startDate?: string,
    endDate?: string,
    defaultDaysBack = 365,
  ): [string, string] {
    if (startDate && endDate) {
      return [startDate, endDate];
    }

    // Fall back to calculating dates based on last_indexed_at
    const calculatedEndDate = new Date();

    let calculatedStartDate: Date;

    // Use last_indexed_at as start date if available, otherwise use default_days_back
    if (connector.lastIndexedAt) {
      const lastIndexedNaive = new Date(connector.lastIndexedAt);

      // Check if last_indexed_at is in the future or after end_date
      if (lastIndexedNaive > calculatedEndDate) {
        this.logger.warn(
          `Last indexed date (${lastIndexedNaive.toISOString().split('T')[0]}) is in the future. Using ${defaultDaysBack} days ago instead.`,
        );
        calculatedStartDate = new Date(
          calculatedEndDate.getTime() - defaultDaysBack * 24 * 60 * 60 * 1000,
        );
      } else {
        calculatedStartDate = lastIndexedNaive;
        this.logger.log(
          `Using last_indexed_at (${calculatedStartDate.toISOString().split('T')[0]}) as start date`,
        );
      }
    } else {
      calculatedStartDate = new Date(
        calculatedEndDate.getTime() - defaultDaysBack * 24 * 60 * 60 * 1000,
      );
      this.logger.log(
        `No last_indexed_at found, using ${calculatedStartDate.toISOString().split('T')[0]} (${defaultDaysBack} days ago) as start date`,
      );
    }

    // Use calculated dates if not provided
    const startDateStr = startDate || calculatedStartDate.toISOString().split('T')[0];
    const endDateStr = endDate || calculatedEndDate.toISOString().split('T')[0];

    return [startDateStr, endDateStr];
  }

  /**
   * Update the last_indexed_at timestamp for a connector.
   *
   * @param connector - The connector object
   * @param updateLastIndexed - Whether to actually update the timestamp
   */
  async updateConnectorLastIndexed(
    connector: SearchSourceConnector,
    updateLastIndexed = true,
  ): Promise<void> {
    if (updateLastIndexed) {
      const now = new Date();
      await this.prisma.searchSourceConnector.update({
        where: { id: connector.id },
        data: { lastIndexedAt: now },
      });
      this.logger.log(`Updated last_indexed_at to ${now.toISOString()}`);
    }
  }

  /**
   * Build a document string from metadata sections.
   *
   * @param metadataSections - List of [sectionTitle, sectionContent] tuples
   * @returns Combined document string
   */
  buildDocumentMetadataString(
    metadataSections: [string, string[]][],
  ): string {
    const documentParts: string[] = ['<DOCUMENT>'];

    for (const [sectionTitle, sectionContent] of metadataSections) {
      documentParts.push(`<${sectionTitle}>`);
      documentParts.push(...sectionContent);
      documentParts.push(`</${sectionTitle}>`);
    }

    documentParts.push('</DOCUMENT>');
    return documentParts.join('\n');
  }

  /**
   * Build a markdown document string from metadata sections.
   *
   * @param metadataSections - List of [sectionTitle, sectionContent] tuples
   * @returns Combined markdown document string
   */
  buildDocumentMetadataMarkdown(
    metadataSections: [string, string[]][],
  ): string {
    const documentParts: string[] = [];

    for (const [sectionTitle, sectionContent] of metadataSections) {
      // Convert section title to proper markdown header
      documentParts.push(
        `## ${sectionTitle.charAt(0).toUpperCase() + sectionTitle.slice(1).toLowerCase()}`,
      );
      documentParts.push(''); // Empty line after header

      for (const contentLine of sectionContent) {
        // Handle special content formatting
        if (contentLine === 'TEXT_START' || contentLine === 'TEXT_END') {
          continue; // Skip text delimiters in markdown
        } else if (contentLine.startsWith('FORMAT: ')) {
          // Skip format indicators in markdown
          continue;
        } else {
          documentParts.push(contentLine);
        }
      }

      documentParts.push(''); // Empty line after section
    }

    // Remove trailing empty lines
    while (documentParts.length > 0 && documentParts[documentParts.length - 1] === '') {
      documentParts.pop();
    }

    return documentParts.join('\n');
  }
}
