import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Prisma, SearchSourceConnectorType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import {
	CreateSearchSourceConnectorDto,
	SearchSourceConnectorDto,
	UpdateSearchSourceConnectorDto,
} from "./dtos/search-source-connector.dto";

@Injectable()
export class SearchSourceConnectorsService {
	constructor(
		private prisma: PrismaService,
		private queueService: QueueService,
	) {}

	async create(
		createDto: CreateSearchSourceConnectorDto,
		searchSpaceId: number,
		userId: string,
	): Promise<SearchSourceConnectorDto> {
		try {
			const existing = await this.prisma.searchSourceConnector.findFirst({
				where: {
					searchSpaceId,
					userId,
					connectorType: createDto.connector_type,
				},
			});

			if (existing) {
				throw new ConflictException(
					`A connector with type ${createDto.connector_type} already exists in this search space`,
				);
			}

			let nextScheduledAt = createDto.next_scheduled_at;
			if (
				createDto.periodic_indexing_enabled &&
				createDto.indexing_frequency_minutes &&
				!nextScheduledAt
			) {
				nextScheduledAt = new Date(
					Date.now() + createDto.indexing_frequency_minutes * 60 * 1000,
				);
			}

			const connector = await this.prisma.searchSourceConnector.create({
				data: {
					name: createDto.name,
					connectorType: createDto.connector_type,
					isIndexable: createDto.is_indexable,
					lastIndexedAt: createDto.last_indexed_at,
					config: createDto.config,
					periodicIndexingEnabled: createDto.periodic_indexing_enabled || false,
					indexingFrequencyMinutes: createDto.indexing_frequency_minutes,
					nextScheduledAt,
					searchSpaceId,
					userId,
				},
			});

			return this.toDto(connector);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ConflictException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create search source connector: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 100,
		searchSpaceId: number,
		name?: string,
	): Promise<SearchSourceConnectorDto[]> {
		try {
			const where: Prisma.SearchSourceConnectorWhereInput = { searchSpaceId };
			if (name) {
				where.name = { contains: name, mode: "insensitive" };
			}
			const connectors = await this.prisma.searchSourceConnector.findMany({
				where,
				skip,
				take: limit,
			});

			return connectors.map((c) => this.toDto(c));
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch search source connectors: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<SearchSourceConnectorDto> {
		try {
			const connector = await this.prisma.searchSourceConnector.findFirst({
				where: { id },
			});

			if (!connector) {
				throw new NotFoundException("Search source connector not found");
			}

			return this.toDto(connector);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch search source connector: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateSearchSourceConnectorDto,
		userId: string,
	): Promise<SearchSourceConnectorDto> {
		try {
			const connector = await this.prisma.searchSourceConnector.findFirst({
				where: { id },
			});

			if (!connector) {
				throw new NotFoundException("Search source connector not found");
			}

			if (
				updateDto.connector_type &&
				updateDto.connector_type !== connector.connectorType
			) {
				const existing = await this.prisma.searchSourceConnector.findFirst({
					where: {
						searchSpaceId: connector.searchSpaceId,
						userId,
						connectorType: updateDto.connector_type,
						id: { not: id },
					},
				});

				if (existing) {
					throw new ConflictException(
						`A connector with type ${updateDto.connector_type} already exists in this search space`,
					);
				}
			}

			const effectiveIsIndexable =
				updateDto.is_indexable ?? connector.isIndexable;
			const effectivePeriodicEnabled =
				updateDto.periodic_indexing_enabled ??
				connector.periodicIndexingEnabled;
			const effectiveFrequency =
				updateDto.indexing_frequency_minutes ??
				connector.indexingFrequencyMinutes;

			if (effectivePeriodicEnabled) {
				if (!effectiveIsIndexable) {
					throw new BadRequestException(
						"periodic_indexing_enabled can only be true for indexable connectors",
					);
				}
				if (!effectiveFrequency || effectiveFrequency <= 0) {
					throw new BadRequestException(
						"indexing_frequency_minutes must be greater than 0 when periodic indexing is enabled",
					);
				}
			}

			let nextScheduledAt = updateDto.next_scheduled_at;
			if (
				effectivePeriodicEnabled &&
				effectiveFrequency &&
				nextScheduledAt === undefined
			) {
				nextScheduledAt = new Date(Date.now() + effectiveFrequency * 60 * 1000);
			} else if (!effectivePeriodicEnabled) {
				nextScheduledAt = null;
			}

			let mergedConfig = connector.config;
			if (updateDto.config) {
				mergedConfig = { ...(mergedConfig as object), ...updateDto.config };
			}

			const updated = await this.prisma.searchSourceConnector.update({
				where: { id },
				data: {
					name: updateDto.name,
					connectorType: updateDto.connector_type,
					isIndexable: updateDto.is_indexable,
					lastIndexedAt: updateDto.last_indexed_at,
					config: mergedConfig,
					periodicIndexingEnabled: updateDto.periodic_indexing_enabled,
					indexingFrequencyMinutes: updateDto.indexing_frequency_minutes,
					nextScheduledAt,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ConflictException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update search source connector: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const connector = await this.prisma.searchSourceConnector.findFirst({
				where: { id },
			});

			if (!connector) {
				throw new NotFoundException("Search source connector not found");
			}

			await this.prisma.searchSourceConnector.delete({
				where: { id },
			});

			return { message: "Search source connector deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete search source connector: ${error.message}`,
			);
		}
	}

	async indexConnectorContent(
		connectorId: number,
		searchSpaceId: number,
		userId: string,
		startDate?: string,
		endDate?: string,
	): Promise<any> {
		try {
			const connector = await this.prisma.searchSourceConnector.findFirst({
				where: { id: connectorId },
			});

			if (!connector) {
				throw new NotFoundException("Search source connector not found");
			}

			const today = new Date().toISOString().split("T")[0];
			let indexingFrom = startDate;
			if (!indexingFrom) {
				if (connector.lastIndexedAt) {
					const lastIndexed = new Date(connector.lastIndexedAt);
					const todayDate = new Date().setHours(0, 0, 0, 0);
					if (lastIndexed.setHours(0, 0, 0, 0) === todayDate) {
						const yesterday = new Date();
						yesterday.setDate(yesterday.getDate() - 1);
						indexingFrom = yesterday.toISOString().split("T")[0];
					} else {
						indexingFrom = connector.lastIndexedAt.toISOString().split("T")[0];
					}
				} else {
					const yearAgo = new Date();
					yearAgo.setFullYear(yearAgo.getFullYear() - 1);
					indexingFrom = yearAgo.toISOString().split("T")[0];
				}
			}

			const indexingTo = endDate || today;

			const startDateObj = indexingFrom ? new Date(indexingFrom) : undefined;
			const endDateObj = indexingTo ? new Date(indexingTo) : undefined;

			switch (connector.connectorType) {
				case SearchSourceConnectorType.SLACK_CONNECTOR:
					await this.queueService.indexSlackMessages(
						connectorId,
						searchSpaceId,
						userId,
						startDateObj,
						endDateObj,
					);
					break;

				case SearchSourceConnectorType.NOTION_CONNECTOR:
					await this.queueService.indexNotionPages(
						connectorId,
						searchSpaceId,
						userId,
						startDateObj,
						endDateObj,
					);
					break;

				case SearchSourceConnectorType.GITHUB_CONNECTOR:
					await this.queueService.indexGitHubRepos(
						connectorId,
						searchSpaceId,
						userId,
						startDateObj,
						endDateObj,
					);
					break;

				case SearchSourceConnectorType.GOOGLE_CALENDAR_CONNECTOR:
					await this.queueService.indexGoogleCalendarEvents(
						connectorId,
						searchSpaceId,
						userId,
						startDateObj,
						endDateObj,
					);
					break;

				case SearchSourceConnectorType.GOOGLE_GMAIL_CONNECTOR:
					await this.queueService.indexGoogleGmailMessages(
						connectorId,
						searchSpaceId,
						userId,
						startDateObj,
						endDateObj,
					);
					break;

				default:
					throw new BadRequestException(
						`Indexing not supported for connector type: ${connector.connectorType}`,
					);
			}

			return {
				message: `${connector.connectorType} indexing started in the background`,
				connector_id: connectorId,
				search_space_id: searchSpaceId,
				indexing_from: indexingFrom,
				indexing_to: indexingTo,
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to initiate indexing: ${error.message}`,
			);
		}
	}

	private toDto(connector: any): SearchSourceConnectorDto {
		return {
			id: connector.id,
			name: connector.name,
			connector_type: connector.connectorType,
			is_indexable: connector.isIndexable,
			last_indexed_at: connector.lastIndexedAt,
			config: connector.config,
			periodic_indexing_enabled: connector.periodicIndexingEnabled,
			indexing_frequency_minutes: connector.indexingFrequencyMinutes,
			next_scheduled_at: connector.nextScheduledAt,
			search_space_id: connector.searchSpaceId,
			user_id: connector.userId,
			created_at: connector.createdAt,
		};
	}
}
