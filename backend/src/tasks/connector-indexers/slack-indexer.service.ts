/**
 * Slack connector indexer service.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectorIndexerBaseService } from './base.service';

@Injectable()
export class SlackIndexerService {
  private readonly logger = new Logger(SlackIndexerService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: ConnectorIndexerBaseService,
  ) {}

  /**
   * Index Slack messages for a connector.
   *
   * @param connectorId - ID of the connector
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @param startDate - Optional start date for indexing (YYYY-MM-DD)
   * @param endDate - Optional end date for indexing (YYYY-MM-DD)
   */
  async indexSlackMessages(
    connectorId: number,
    searchSpaceId: number,
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    this.logger.log(
      `Starting Slack indexing for connector ${connectorId}`,
    );

    try {
      const connector = await this.baseService.getConnectorById(
        connectorId,
        'SLACK_CONNECTOR' as any,
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
        `Indexing Slack messages from ${startDateStr} to ${endDateStr}`,
      );

      // Slack indexing logic would go here
      // ...

      await this.baseService.updateConnectorLastIndexed(connector);

      this.logger.log(
        `Completed Slack indexing for connector ${connectorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to index Slack messages: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
