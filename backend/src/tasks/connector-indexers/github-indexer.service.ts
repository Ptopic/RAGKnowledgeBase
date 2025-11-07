/**
 * GitHub connector indexer service.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectorIndexerBaseService } from './base.service';

@Injectable()
export class GithubIndexerService {
  private readonly logger = new Logger(GithubIndexerService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: ConnectorIndexerBaseService,
  ) {}

  /**
   * Index GitHub repositories for a connector.
   *
   * @param connectorId - ID of the connector
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @param startDate - Optional start date for indexing (YYYY-MM-DD)
   * @param endDate - Optional end date for indexing (YYYY-MM-DD)
   */
  async indexGithubRepos(
    connectorId: number,
    searchSpaceId: number,
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    this.logger.log(
      `Starting GitHub indexing for connector ${connectorId}`,
    );

    // Note: Actual GitHub API integration would be implemented here

    try {
      const connector = await this.baseService.getConnectorById(
        connectorId,
        'GITHUB_CONNECTOR' as any,
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
        `Indexing GitHub repos from ${startDateStr} to ${endDateStr}`,
      );

      // GitHub indexing logic would go here
      // ...

      await this.baseService.updateConnectorLastIndexed(connector);

      this.logger.log(
        `Completed GitHub indexing for connector ${connectorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to index GitHub repos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
