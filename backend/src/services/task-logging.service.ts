import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SseService } from '../sse/sse.service';
import { LogLevel, LogStatus, Log } from '@prisma/client';

@Injectable()
export class TaskLoggingService {
	private readonly logger = new Logger(TaskLoggingService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly searchSpaceId: number,
		private readonly sseService: SseService,
	) {}

	static forSearchSpace(
		prisma: PrismaService,
		searchSpaceId: number,
		sseService: SseService,
	): TaskLoggingService {
		return new TaskLoggingService(prisma, searchSpaceId, sseService);
	}

	/**
	 * Log the start of a task with IN_PROGRESS status
	 */
	async logTaskStart(
		taskName: string,
		source: string,
		message: string,
		metadata?: Record<string, any>,
	): Promise<Log> {
		const logMetadata = metadata || {};
		logMetadata.task_name = taskName;
		logMetadata.started_at = new Date().toISOString();

		const logEntry = await this.prisma.log.create({
			data: {
				level: LogLevel.INFO,
				status: LogStatus.IN_PROGRESS,
				message,
				source,
				logMetadata,
				searchSpaceId: this.searchSpaceId,
			},
		});

		this.logger.log(`Started task ${taskName}: ${message}`);

		this.sseService.broadcastEvent({
			topic: 'logs',
			data: { action: 'create', searchSpaceId: this.searchSpaceId, logId: logEntry.id },
		});

		return logEntry;
	}

	/**
	 * Update a log entry to SUCCESS status
	 */
	async logTaskSuccess(
		logEntry: Log,
		message: string,
		additionalMetadata?: Record<string, any>,
	): Promise<Log> {
		try {
			// Merge additional metadata
			const updatedMetadata = logEntry.logMetadata
				? { ...(logEntry.logMetadata as Record<string, any>) }
				: {};

			if (additionalMetadata) {
				Object.assign(updatedMetadata, additionalMetadata);
			}
			updatedMetadata.completed_at = new Date().toISOString();

			const updated = await this.prisma.log.update({
				where: { id: logEntry.id },
				data: {
					status: LogStatus.SUCCESS,
					message,
					logMetadata: updatedMetadata,
				},
			});

			const taskName = updatedMetadata.task_name || 'unknown';
			this.logger.log(`Completed task ${taskName}: ${message}`);

			this.sseService.broadcastEvent({
				topic: 'logs',
				data: { action: 'update', searchSpaceId: this.searchSpaceId, logId: updated.id },
			});

			return updated;
		} catch (error) {
			this.logger.error(`Error updating log entry to success: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update a log entry to FAILED status
	 */
	async logTaskFailure(
		logEntry: Log,
		errorMessage: string,
		errorDetails?: string,
		additionalMetadata?: Record<string, any>,
	): Promise<Log> {
		try {
			// Merge additional metadata
			const updatedMetadata = logEntry.logMetadata
				? { ...(logEntry.logMetadata as Record<string, any>) }
				: {};

			updatedMetadata.failed_at = new Date().toISOString();
			updatedMetadata.error_details = errorDetails;

			if (additionalMetadata) {
				Object.assign(updatedMetadata, additionalMetadata);
			}

			const updated = await this.prisma.log.update({
				where: { id: logEntry.id },
				data: {
					status: LogStatus.FAILED,
					level: LogLevel.ERROR,
					message: errorMessage,
					logMetadata: updatedMetadata,
				},
			});

			const taskName = updatedMetadata.task_name || 'unknown';
			this.logger.error(`Failed task ${taskName}: ${errorMessage}`);
			if (errorDetails) {
				this.logger.error(`Error details: ${errorDetails}`);
			}

			this.sseService.broadcastEvent({
				topic: 'logs',
				data: { action: 'update', searchSpaceId: this.searchSpaceId, logId: updated.id },
			});

			return updated;
		} catch (error) {
			this.logger.error(`Error updating log entry to failure: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update a log entry with progress information while keeping IN_PROGRESS status
	 */
	async logTaskProgress(
		logEntry: Log,
		progressMessage: string,
		progressMetadata?: Record<string, any>,
	): Promise<Log> {
		try {
			// Merge progress metadata
			const updatedMetadata = logEntry.logMetadata
				? { ...(logEntry.logMetadata as Record<string, any>) }
				: {};

			if (progressMetadata) {
				Object.assign(updatedMetadata, progressMetadata);
			}
			updatedMetadata.last_progress_update = new Date().toISOString();

			const updated = await this.prisma.log.update({
				where: { id: logEntry.id },
				data: {
					message: progressMessage,
					logMetadata: updatedMetadata,
				},
			});

			const taskName = updatedMetadata.task_name || 'unknown';
			this.logger.log(`Progress update for task ${taskName}: ${progressMessage}`);

			this.sseService.broadcastEvent({
				topic: 'logs',
				data: { action: 'update', searchSpaceId: this.searchSpaceId, logId: updated.id },
			});

			return updated;
		} catch (error) {
			this.logger.error(`Error updating log entry progress: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Log a simple event (not a long-running task)
	async logSimpleEvent(
		level: LogLevel,
		source: string,
		message: string,
		metadata?: Record<string, any>,
	): Promise<Log> {
		const logEntry = await this.prisma.log.create({
			data: {
				level,
				status: LogStatus.SUCCESS, // Simple events are immediately complete
				message,
				source,
				logMetadata: metadata || {},
				searchSpaceId: this.searchSpaceId,
			},
		});

		this.logger.log(`Logged event from ${source}: ${message}`);

		this.sseService.broadcastEvent({
			topic: 'logs',
			data: { action: 'create', searchSpaceId: this.searchSpaceId, logId: logEntry.id },
		});

		return logEntry;
	}

	/**
	 * Log a "document indexed" event for a single document produced by a
	 * connector indexer. Writes a Log row tagged with the connector source
	 * (so the logs page shows it as part of the indexing task), emits a
	 * `logs` SSE event (so the logs page auto-refreshes), and emits a
	 * `documents` SSE event (so the documents page auto-refreshes).
	 *
	 * Best-effort: failures here are logged but never thrown, so a log
	 * write can never break the indexing loop.
	 */
	async logDocumentIndexed(
		source: string,
		documentId: number,
		title: string,
		action: 'created' | 'updated',
		additionalMetadata: Record<string, any> = {},
	): Promise<Log | null> {
		try {
			const message =
				action === 'created'
					? `Indexed new document: ${title}`
					: `Updated document: ${title}`;
			const logEntry = await this.prisma.log.create({
				data: {
					level: LogLevel.INFO,
					status: LogStatus.SUCCESS,
					message,
					source,
					logMetadata: {
						document_id: documentId,
						document_title: title,
						action,
						...additionalMetadata,
					},
					searchSpaceId: this.searchSpaceId,
				},
			});

			// Notify the logs page so it auto-refreshes.
			this.sseService.broadcastEvent({
				topic: 'logs',
				data: {
					action: 'create',
					searchSpaceId: this.searchSpaceId,
					logId: logEntry.id,
				},
			});

			// Notify the documents page so the table updates per-document
			// (without waiting for the overall task to finish).
			this.sseService.broadcastEvent({
				topic: 'documents',
				data: {
					action,
					searchSpaceId: this.searchSpaceId,
					documentId,
				},
			});

			return logEntry;
		} catch (err) {
			this.logger.warn(
				`Failed to log document-indexed event for ${documentId}: ${(err as Error).message}`,
			);
			return null;
		}
	}
}