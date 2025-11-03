import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.config';

/**
 * Schedule Checker Processor
 *
 * Meta-scheduler pattern: Checks database for connectors that need periodic indexing
 * and triggers their indexing tasks. Runs on a configurable interval (default 2-5 minutes).
 */
@Processor(QUEUE_NAMES.SCHEDULER)
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check all connectors for periodic indexing that's due
   */
  @Process('check-periodic-schedules')
  async checkPeriodicSchedules(job: Job) {
    try {
      this.logger.debug('Checking for connectors due for periodic indexing');

      const now = new Date();

      const dueConnectors = await this.prisma.searchSourceConnector.findMany({
        where: {
          periodicIndexingEnabled: true,
          nextScheduledAt: {
            lte: now,
          },
        },
      });

      if (dueConnectors.length === 0) {
        this.logger.debug('No connectors due for periodic indexing');
        return;
      }

      this.logger.log(
        `Found ${dueConnectors.length} connectors due for indexing`,
      );

      const taskMap: Record<string, string> = {
        SLACK_CONNECTOR: 'index-slack-messages',
        NOTION_CONNECTOR: 'index-notion-pages',
        GITHUB_CONNECTOR: 'index-github-repos',
        GOOGLE_CALENDAR_CONNECTOR: 'index-google-calendar-events',
        GOOGLE_GMAIL_CONNECTOR: 'index-google-gmail-messages',
      };

      for (const connector of dueConnectors) {
        const taskName = taskMap[connector.connectorType];

        if (taskName) {
          this.logger.log(
            `Triggering periodic indexing for connector ${connector.id} (${connector.connectorType})`,
          );

          // TODO: Trigger the actual connector indexing job
          // This will be implemented when we add connector processors
          // await this.connectorQueue.add(taskName, {
          //   connectorId: connector.id,
          //   searchSpaceId: connector.searchSpaceId,
          //   userId: connector.userId,
          //   startDate: null, // uses last_indexed_at
          //   endDate: null, // uses now
          // });

          const nextScheduledAt = new Date(
            now.getTime() + connector.indexingFrequencyMinutes * 60000,
          );

          await this.prisma.searchSourceConnector.update({
            where: { id: connector.id },
            data: { nextScheduledAt },
          });
        } else {
          this.logger.warn(
            `No task found for connector type ${connector.connectorType}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error checking periodic schedules:',
        error.stack || error,
      );
      throw error; // Bull will retry based on job configuration
    }
  }
}
