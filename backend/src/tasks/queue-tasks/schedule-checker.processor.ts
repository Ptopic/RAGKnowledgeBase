/**
 * Meta-scheduler task that checks for connectors needing periodic indexing.
 */

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('schedule-checker')
export class ScheduleCheckerProcessor {
  private readonly logger = new Logger(ScheduleCheckerProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('connector-tasks') private connectorTasksQueue: Queue,
  ) {}

  /**
   * Check all connectors for periodic indexing that's due.
   * This task runs periodically (e.g., every minute) and triggers indexing
   * for any connector whose next_scheduled_at time has passed.
   */
  @Process('check_periodic_schedules')
  async checkPeriodicSchedules(job: Job) {
    this.logger.debug('Checking periodic schedules for connectors');

    try {
      const now = new Date();

      // Find all connectors with periodic indexing enabled that are due
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

      // Map connector types to their task names
      const taskMap: Record<string, string> = {
        GITHUB_CONNECTOR: 'index_github_repos',
        GOOGLE_CALENDAR_CONNECTOR: 'index_google_calendar_events',
        GOOGLE_GMAIL_CONNECTOR: 'index_google_gmail_messages',
        NOTION_CONNECTOR: 'index_notion_pages',
        SLACK_CONNECTOR: 'index_slack_messages',
      };

      // Trigger indexing for each due connector
      for (const connector of dueConnectors) {
        const taskName = taskMap[connector.connectorType];
        if (taskName) {
          this.logger.log(
            `Triggering periodic indexing for connector ${connector.id} (${connector.connectorType})`,
          );

          // Add job to queue
          await this.connectorTasksQueue.add(taskName, {
            connectorId: connector.id,
            searchSpaceId: connector.searchSpaceId,
            userId: connector.userId,
            startDate: null, // Uses last_indexed_at
            endDate: null, // Uses now
          });

          // Update next_scheduled_at for next run
          const indexingFrequencyMs =
            (connector.indexingFrequencyMinutes || 60) * 60 * 1000;
          const nextScheduledAt = new Date(now.getTime() + indexingFrequencyMs);

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

      this.logger.log(
        `Scheduled ${dueConnectors.length} periodic indexing jobs`,
      );
    } catch (error) {
      this.logger.error(
        `Error checking periodic schedules: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
