import {
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	CreateQueryTemplateDto,
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

	async findAllGlobal(): Promise<QueryTemplateDto[]> {
		try {
			const templates = await this.prisma.queryTemplate.findMany({
				where: { isGlobal: true },
				orderBy: { createdAt: "desc" },
			});

			return templates.map((t) => this.toDto(t));
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch global query templates: ${error.message}`,
			);
		}
	}

	async findAllForSearchSpace(
		searchSpaceId: number,
		userId: string,
	): Promise<QueryTemplateDto[]> {
		try {
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const templates = await this.prisma.queryTemplate.findMany({
				where: {
					OR: [{ isGlobal: true }, { searchSpaceId }],
				},
				orderBy: [{ isGlobal: "desc" }, { createdAt: "desc" }],
			});

			return templates.map((t) => this.toDto(t));
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

			const updated = await this.prisma.queryTemplate.update({
				where: { id },
				data: {
					...(updateDto.title !== undefined && { title: updateDto.title }),
					...(updateDto.description !== undefined && {
						description: updateDto.description,
					}),
					...(updateDto.content !== undefined && { content: updateDto.content }),
					...(updateDto.icon !== undefined && { icon: updateDto.icon }),
				},
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

	private toDto(template: any): QueryTemplateDto {
		return {
			id: template.id,
			title: template.title,
			description: template.description,
			content: template.content,
			icon: template.icon,
			is_global: template.isGlobal,
			search_space_id: template.searchSpaceId,
			created_by_id: template.createdById,
			created_at: template.createdAt,
			updated_at: template.updatedAt,
		};
	}
}
