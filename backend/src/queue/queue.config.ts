import { BullModuleOptions } from '@nestjs/bull';

/**
 * Bull Queue configuration
 */
export const bullConfig: BullModuleOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  defaultJobOptions: {
    // Task execution settings
    timeout: 3600000, // 1 hour hard limit (in milliseconds)
    attempts: 3, // Retry failed jobs 3 times
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours (matches result_expires)
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
  settings: {
    // Worker settings
    lockDuration: 30000, // 30 seconds
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1, // Consider job failed after 1 stall
  },
};

/**
 * Parse schedule interval string into cron expression
 *
 * @param interval - String like "1m", "5m", "1h", etc.
 * @returns Cron expression for Bull repeatable jobs
 */
export function parseScheduleInterval(interval: string): string {
  const cleanInterval = interval.trim().toLowerCase();

  // Extract number and unit
  if (cleanInterval.endsWith('m') || cleanInterval.endsWith('min')) {
    // Minutes
    const num = parseInt(cleanInterval.replace(/min?$/, ''));
    if (num === 1) {
      return '* * * * *'; // Every minute
    } else {
      return `*/${num} * * * *`; // Every N minutes
    }
  } else if (cleanInterval.endsWith('h') || cleanInterval.endsWith('hour')) {
    // Hours
    const num = parseInt(cleanInterval.replace(/hours?$/, ''));
    if (num === 1) {
      return '0 * * * *'; // Every hour
    } else {
      return `0 */${num} * * *`; // Every N hours
    }
  } else {
    // Default to every minute if parsing fails
    return '* * * * *';
  }
}

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  DOCUMENTS: 'documents',
  CONNECTORS: 'connectors',
  SCHEDULER: 'scheduler',
  CREDIT_DEDUCTIONS: 'credit-deductions',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
