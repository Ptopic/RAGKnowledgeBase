import {
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	CreateQueryTemplateDto,
	PaginatedQueryTemplatesResponseDto,
	QueryTemplateDto,
	UpdateQueryTemplateDto,
} from "./dtos/query-template.dto";

@Injectable()
export class QueryTemplatesService {
	constructor(private prisma: PrismaService) {}

	async createGlobal(
		createDto: CreateQueryTemplateDto,
		userId: string,
	): Promise<QueryTemplateDto> {
		try {
			const template = await this.prisma.queryTemplate.create({
				data: {
					title: createDto.title,
					description: createDto.description,
					content: createDto.content,
					icon: createDto.icon,
					isGlobal: true,
					searchSpaceId: null,
					createdById: userId,
				},
			});

			return this.toDto(template);
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to create global query template: ${error.message}`,
			);
		}
	}

	async createForSearchSpace(
		searchSpaceId: number,
		createDto: CreateQueryTemplateDto,
		userId: string,
	): Promise<QueryTemplateDto> {
		try {
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const template = await this.prisma.queryTemplate.create({
				data: {
					title: createDto.title,
					description: createDto.description,
					content: createDto.content,
					icon: createDto.icon,
					isGlobal: false,
					searchSpaceId,
					createdById: userId,
				},
			});

			return this.toDto(template);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create query template: ${error.message}`,
			);
		}
	}

	async findAllGlobal(
		search?: string,
		skip: number = 0,
		limit: number = 100,
	): Promise<PaginatedQueryTemplatesResponseDto> {
		try {
			const where: any = { isGlobal: true };

			if (search) {
				where.OR = [
					{ title: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
					{ content: { contains: search, mode: "insensitive" } },
				];
			}

			const [templates, total] = await Promise.all([
				this.prisma.queryTemplate.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
				}),
				this.prisma.queryTemplate.count({ where }),
			]);

			return {
				items: templates.map((t) => this.toDto(t)),
				total,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch global query templates: ${error.message}`,
			);
		}
	}

	async findAllForSearchSpace(
		searchSpaceId: number,
		userId: string,
		search?: string,
		skip: number = 0,
		limit: number = 100,
	): Promise<PaginatedQueryTemplatesResponseDto> {
		try {
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id: searchSpaceId, userId },
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});
			const pinnedIds = (searchSpace?.pinnedQueryTemplates ?? []).map(
				(p: any) => p.queryTemplateId,
			);

			const where: any = {
				OR: [{ isGlobal: true }, { searchSpaceId }],
			};

			if (search) {
				where.OR = [
					{ isGlobal: true, title: { contains: search, mode: "insensitive" } },
					{ isGlobal: true, description: { contains: search, mode: "insensitive" } },
					{ isGlobal: true, content: { contains: search, mode: "insensitive" } },
					{ searchSpaceId, title: { contains: search, mode: "insensitive" } },
					{ searchSpaceId, description: { contains: search, mode: "insensitive" } },
					{ searchSpaceId, content: { contains: search, mode: "insensitive" } },
				];
			}

			const [templates, total] = await Promise.all([
				this.prisma.queryTemplate.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ isGlobal: "desc" }, { createdAt: "desc" }],
				}),
				this.prisma.queryTemplate.count({ where }),
			]);

			const sorted = [...templates].sort((a, b) => {
				const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
				const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
				return aPinned - bPinned;
			});

			return {
				items: sorted.map((t) => this.toDto(t, pinnedIds)),
				total,
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch query templates: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<QueryTemplateDto> {
		try {
			const template = await this.prisma.queryTemplate.findUnique({
				where: { id },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			if (!template.isGlobal && template.searchSpaceId) {
				await this.checkSearchSpaceAccess(template.searchSpaceId, userId);
			}

			return this.toDto(template);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch query template: ${error.message}`,
			);
		}
	}

	async updateGlobal(
		id: number,
		updateDto: UpdateQueryTemplateDto,
		userId: string,
	): Promise<QueryTemplateDto> {
		try {
			const template = await this.prisma.queryTemplate.findUnique({
				where: { id },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			if (!template.isGlobal) {
				throw new ForbiddenException(
					"Use the search-space endpoint to update per-space templates",
				);
			}

			const updateData: any = {
				...(updateDto.title !== undefined && { title: updateDto.title }),
				...(updateDto.description !== undefined && {
					description: updateDto.description,
				}),
				...(updateDto.content !== undefined && { content: updateDto.content }),
				...(updateDto.icon !== undefined && { icon: updateDto.icon }),
			};

			if (updateDto.is_global !== undefined && updateDto.is_global !== template.isGlobal) {
				updateData.isGlobal = updateDto.is_global;
				updateData.searchSpaceId = updateDto.is_global ? null : template.searchSpaceId;
			}

			const updated = await this.prisma.queryTemplate.update({
				where: { id },
				data: updateData,
			});

			return this.toDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update query template: ${error.message}`,
			);
		}
	}

	async updateForSearchSpace(
		id: number,
		searchSpaceId: number,
		updateDto: UpdateQueryTemplateDto,
		userId: string,
	): Promise<QueryTemplateDto> {
		try {
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const template = await this.prisma.queryTemplate.findUnique({
				where: { id },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			const isGlobalTemplate = template.isGlobal;
			const belongsToSpace = template.searchSpaceId === searchSpaceId;

			if (!isGlobalTemplate && !belongsToSpace) {
				throw new NotFoundException(
					"Query template not found in this search space",
				);
			}

			const updateData: any = {
				...(updateDto.title !== undefined && { title: updateDto.title }),
				...(updateDto.description !== undefined && {
					description: updateDto.description,
				}),
				...(updateDto.content !== undefined && { content: updateDto.content }),
				...(updateDto.icon !== undefined && { icon: updateDto.icon }),
			};

			if (updateDto.is_global !== undefined && updateDto.is_global !== template.isGlobal) {
				updateData.isGlobal = updateDto.is_global;
				updateData.searchSpaceId = updateDto.is_global ? null : searchSpaceId;
			}

			const updated = await this.prisma.queryTemplate.update({
				where: { id },
				data: updateData,
			});

			return this.toDto(updated);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update query template: ${error.message}`,
			);
		}
	}

	async removeGlobal(
		id: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			const template = await this.prisma.queryTemplate.findUnique({
				where: { id },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			if (!template.isGlobal) {
				throw new ForbiddenException(
					"Use the search-space endpoint to delete per-space templates",
				);
			}

			await this.prisma.queryTemplate.delete({
				where: { id },
			});

			return { message: "Global query template deleted successfully" };
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete query template: ${error.message}`,
			);
		}
	}

	async removeForSearchSpace(
		id: number,
		searchSpaceId: number,
		userId: string,
	): Promise<{ message: string }> {
		try {
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const template = await this.prisma.queryTemplate.findUnique({
				where: { id },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			if (template.searchSpaceId !== searchSpaceId) {
				throw new NotFoundException(
					"Query template not found in this search space",
				);
			}

			await this.prisma.queryTemplate.delete({
				where: { id },
			});

			return { message: "Query template deleted successfully" };
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete query template: ${error.message}`,
			);
		}
	}

	async pinQueryTemplate(
		templateId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<{ pinned_query_template_ids: number[] }> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id: searchSpaceId, userId },
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			if (!searchSpace) {
				throw new NotFoundException(
					"Search space not found or you do not have permission to access it",
				);
			}

			const template = await this.prisma.queryTemplate.findUnique({
				where: { id: templateId },
			});

			if (!template) {
				throw new NotFoundException("Query template not found");
			}

			if (
				!template.isGlobal &&
				template.searchSpaceId !== searchSpaceId
			) {
				throw new NotFoundException(
					"Query template not found in this search space",
				);
			}

			const currentPinned = searchSpace.pinnedQueryTemplates.map(
				(p: any) => p.queryTemplateId,
			);

			if (currentPinned.includes(templateId)) {
				return { pinned_query_template_ids: currentPinned };
			}

			if (currentPinned.length >= 2) {
				throw new ForbiddenException(
					"You can only pin up to 2 query templates.",
				);
			}

			await this.prisma.searchSpacePinnedQueryTemplate.create({
				data: {
					searchSpaceId,
					queryTemplateId: templateId,
				},
			});

			const updatedPinned = [...currentPinned, templateId];
			return { pinned_query_template_ids: updatedPinned };
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to pin query template: ${error.message}`,
			);
		}
	}

	async unpinQueryTemplate(
		templateId: number,
		searchSpaceId: number,
		userId: string,
	): Promise<{ pinned_query_template_ids: number[] }> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id: searchSpaceId, userId },
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			if (!searchSpace) {
				throw new NotFoundException(
					"Search space not found or you do not have permission to access it",
				);
			}

			await this.prisma.searchSpacePinnedQueryTemplate.deleteMany({
				where: { searchSpaceId, queryTemplateId: templateId },
			});

			const updatedPinned = searchSpace.pinnedQueryTemplates
				.map((p: any) => p.queryTemplateId)
				.filter((id: number) => id !== templateId);

			return { pinned_query_template_ids: updatedPinned };
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to unpin query template: ${error.message}`,
			);
		}
	}

	private async checkSearchSpaceAccess(
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

	private toDto(template: any, pinnedIds: number[] = []): QueryTemplateDto {
		return {
			id: template.id,
			title: template.title,
			description: template.description,
			content: template.content,
			icon: template.icon,
			is_global: template.isGlobal,
			is_pinned: pinnedIds.includes(template.id),
			search_space_id: template.searchSpaceId,
			created_by_id: template.createdById,
			created_at: template.createdAt,
			updated_at: template.updatedAt,
		};
	}
}
