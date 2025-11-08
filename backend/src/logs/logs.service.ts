import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { LogLevel, LogStatus } from "@prisma/client";
import { CreateLogDto, LogDto, UpdateLogDto } from "../dtos/log.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LogsService {
	constructor(private prisma: PrismaService) {}

	async checkSearchSpaceOwnership(
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		const searchSpace = await this.prisma.searchSpace.findFirst({
			where: { id: searchSpaceId, userId },
		});

		if (!searchSpace) {
			throw new NotFoundException(
				"Search space not found or you do not have permission to access it",
			);
		}
	}

	async create(createDto: CreateLogDto, userId: string): Promise<LogDto> {
		try {
			await this.checkSearchSpaceOwnership(createDto.search_space_id, userId);

			const log = await this.prisma.log.create({
				data: {
					level: createDto.level,
					status: createDto.status,
					message: createDto.message,
					source: createDto.source,
					logMetadata: createDto.log_metadata || {},
					searchSpaceId: createDto.search_space_id,
				},
			});

			return this.toDto(log);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create log: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 100,
		searchSpaceId?: number,
		level?: LogLevel,
		status?: LogStatus,
		source?: string,
		startDate?: Date,
		endDate?: Date,
	): Promise<LogDto[]> {
		try {
			const where: any = {
				searchSpace: { userId },
			};

			if (searchSpaceId !== undefined) {
				await this.checkSearchSpaceOwnership(searchSpaceId, userId);
				where.searchSpaceId = searchSpaceId;
			}

			if (level !== undefined) {
				where.level = level;
			}

			if (status !== undefined) {
				where.status = status;
			}

			if (source !== undefined) {
				where.source = { contains: source, mode: "insensitive" };
			}

			if (startDate !== undefined) {
				where.createdAt = { ...where.createdAt, gte: startDate };
			}

			if (endDate !== undefined) {
				where.createdAt = { ...where.createdAt, lte: endDate };
			}

			const logs = await this.prisma.log.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
			});

			return logs.map((log) => this.toDto(log));
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch logs: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<LogDto> {
		try {
			const log = await this.prisma.log.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!log) {
				throw new NotFoundException("Log not found");
			}

			return this.toDto(log);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch log: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateLogDto,
		userId: string,
	): Promise<LogDto> {
		try {
			const log = await this.prisma.log.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!log) {
				throw new NotFoundException("Log not found");
			}

			const updated = await this.prisma.log.update({
				where: { id },
				data: {
					level: updateDto.level,
					status: updateDto.status,
					message: updateDto.message,
					source: updateDto.source,
					logMetadata: updateDto.log_metadata,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update log: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const log = await this.prisma.log.findFirst({
				where: {
					id,
					searchSpace: { userId },
				},
			});

			if (!log) {
				throw new NotFoundException("Log not found");
			}

			await this.prisma.log.delete({
				where: { id },
			});

			return { message: "Log deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete log: ${error.message}`,
			);
		}
	}

	async getLogsSummary(
		searchSpaceId: number,
		userId: string,
		hours: number = 24,
	): Promise<any> {
		try {
			await this.checkSearchSpaceOwnership(searchSpaceId, userId);

			const since = new Date(Date.now() - hours * 60 * 60 * 1000);

			const logs = await this.prisma.log.findMany({
				where: {
					searchSpaceId,
					createdAt: { gte: since },
				},
				orderBy: { createdAt: "desc" },
			});

			const summary: any = {
				total_logs: logs.length,
				time_window_hours: hours,
				by_status: {},
				by_level: {},
				by_source: {},
				active_tasks: [],
				recent_failures: [],
			};

			for (const log of logs) {
				summary.by_status[log.status] =
					(summary.by_status[log.status] || 0) + 1;
				summary.by_level[log.level] = (summary.by_level[log.level] || 0) + 1;

				if (log.source) {
					summary.by_source[log.source] =
						(summary.by_source[log.source] || 0) + 1;
				}

				if (log.status === LogStatus.IN_PROGRESS) {
					const taskName = (log.logMetadata as any)?.task_name || "Unknown";
					summary.active_tasks.push({
						id: log.id,
						task_name: taskName,
						message: log.message,
						started_at: log.createdAt,
						source: log.source,
					});
				}

				if (
					log.status === LogStatus.FAILED &&
					summary.recent_failures.length < 10
				) {
					const taskName = (log.logMetadata as any)?.task_name || "Unknown";
					summary.recent_failures.push({
						id: log.id,
						task_name: taskName,
						message: log.message,
						failed_at: log.createdAt,
						source: log.source,
						error_details: (log.logMetadata as any)?.error_details,
					});
				}
			}

			return summary;
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to generate logs summary: ${error.message}`,
			);
		}
	}

	private toDto(log: any): LogDto {
		return {
			id: log.id,
			level: log.level,
			status: log.status,
			message: log.message,
			source: log.source,
			log_metadata: log.logMetadata,
			search_space_id: log.searchSpaceId,
			created_at: log.createdAt,
		};
	}
}
