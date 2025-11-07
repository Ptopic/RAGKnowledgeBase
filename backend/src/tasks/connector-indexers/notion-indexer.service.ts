/**
 * Notion connector indexer service.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectorIndexerBaseService } from './base.service';

@Injectable()
export class NotionIndexerService {
  private readonly logger = new Logger(NotionIndexerService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: ConnectorIndexerBaseService,
  ) {}

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
    this.logger.log(
      `Starting Notion indexing for connector ${connectorId}`,
    );

    try {
      const connector = await this.baseService.getConnectorById(
        connectorId,
        'NOTION_CONNECTOR' as any,
      );

      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      const [startDateStr, endDateStr] = this.baseService.calculateDateRange(
        connector,
        startDate,
        endDate,
      );

      this.logger.log(
        `Indexing Notion pages from ${startDateStr} to ${endDateStr}`,
      );

      // Notion indexing logic would go here
      // ...

      await this.baseService.updateConnectorLastIndexed(connector);

      this.logger.log(
        `Completed Notion indexing for connector ${connectorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to index Notion pages: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
