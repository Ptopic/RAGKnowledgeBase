import { Logger } from '@nestjs/common';
import { SearchSourceConnectorType } from '@prisma/client';
// TODO: Implement QueueService
// import { QueueService } from '../queue/queue.service';

const logger = new Logger('PeriodicScheduler');

/**
 * Mapping of connector types to their corresponding Bull Queue job names
 */
export const CONNECTOR_TASK_MAP = {
  [SearchSourceConnectorType.SLACK_CONNECTOR]: 'index-slack-messages',
  [SearchSourceConnectorType.NOTION_CONNECTOR]: 'index-notion-pages',
  [SearchSourceConnectorType.GITHUB_CONNECTOR]: 'index-github-repos',
  [SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR]: 'index-google-calendar-events',
  [SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR]: 'index-google-gmail-messages',
} as const;

/**
 * Trigger the first indexing run immediately when periodic indexing is enabled.
 *
 * Note: The periodic schedule is managed by the database (nextScheduledAt field)
 * and checked by the meta-scheduler task that runs every minute.
 * This function just triggers the first run for immediate feedback.
 * 
 * TODO: Implement when QueueService is available
 */
export async function createPeriodicSchedule(
  // biome-ignore lint/suspicious/noExplicitAny: QueueService type not yet implemented
  _queueService: any, // TODO: Replace with QueueService type when implemented
  connectorId: number,
  _searchSpaceId: number,
  _userId: string,
  connectorType: SearchSourceConnectorType,
  frequencyMinutes: number,
): Promise<boolean> {
  try {
    logger.log(
      `Periodic indexing enabled for connector ${connectorId} ` +
        `(frequency: ${frequencyMinutes} minutes). Triggering first run...`,
    );

    const taskName = CONNECTOR_TASK_MAP[connectorType];

    if (!taskName) {
      logger.error(`No task mapping found for connector type: ${connectorType}`);
      return false;
    }

    // TODO: Implement when QueueService is available
    // Trigger the first run immediately
    // switch (connectorType) {
    //   case SearchSourceConnectorType.SLACK_CONNECTOR:
    //     await queueService.indexSlackMessages(connectorId, searchSpaceId, userId, null, null);
    //     break;
    //   case SearchSourceConnectorType.NOTION_CONNECTOR:
    //     await queueService.indexNotionPages(connectorId, searchSpaceId, userId, null, null);
    //     break;
    //   case SearchSourceConnectorType.GITHUB_CONNECTOR:
    //     await queueService.indexGitHubRepos(connectorId, searchSpaceId, userId, null, null);
    //     break;
    //   case SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR:
    //     await queueService.indexGoogleCalendarEvents(connectorId, searchSpaceId, userId, null, null);
    //     break;
    //   case SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR:
    //     await queueService.indexGoogleGmailMessages(connectorId, searchSpaceId, userId, null, null);
    //     break;
    //   default:
    //     logger.error(`Unsupported connector type: ${connectorType}`);
    //     return false;
    // }

    logger.warn('QueueService not yet implemented - skipping first indexing run');

    logger.log(
      `✓ Periodic schedule configured for connector ${connectorId}. ` +
        `Will run automatically every ${frequencyMinutes} minutes once QueueService is implemented.`,
    );

    return true;
  } catch (error) {
    logger.error(
      `Failed to configure periodic schedule for connector ${connectorId}: ${(error as Error).message}`,
      (error as Error).stack,
    );
    return false;
  }
}

/**
 * Handle deletion of periodic schedule for a connector.
 *
 * Note: With the meta-scheduler pattern, the schedule is managed in the database.
 * The nextScheduledAt field being set to null effectively disables it.
 * This function just logs the action.
 */
export function deletePeriodicSchedule(connectorId: number): boolean {
  logger.log(`Periodic indexing disabled for connector ${connectorId}`);
  return true;
}

/**
 * Update an existing periodic schedule for a connector.
 *
 * Note: With the meta-scheduler pattern, updates are handled by the database.
 * This function logs the update and optionally triggers an immediate run.
 * 
 * TODO: Implement when QueueService is available
 */
export async function updatePeriodicSchedule(
  // biome-ignore lint/suspicious/noExplicitAny: QueueService type not yet implemented
  _queueService: any, // TODO: Replace with QueueService type when implemented
  connectorId: number,
  _searchSpaceId: number,
  _userId: string,
  _connectorType: SearchSourceConnectorType,
  frequencyMinutes: number,
): Promise<boolean> {
  logger.log(
    `Periodic indexing schedule updated for connector ${connectorId} ` +
      `(new frequency: ${frequencyMinutes} minutes)`,
  );

  // TODO: Optionally trigger an immediate run with the new schedule
  // Uncomment the line below if you want immediate execution on schedule update
  // return createPeriodicSchedule(queueService, connectorId, searchSpaceId, userId, connectorType, frequencyMinutes);

  return true;
}
