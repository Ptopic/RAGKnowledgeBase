import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	CreateSearchSpaceDto,
	SearchSpaceDto,
	UpdateSearchSpaceDto,
} from "./dtos/search-space.dto";

@Injectable()
export class SearchSpacesService {
	constructor(private prisma: PrismaService) {}

	async create(
		createDto: CreateSearchSpaceDto,
		userId: string,
	): Promise<SearchSpaceDto> {
		try {
			const searchSpace = await this.prisma.searchSpace.create({
				data: {
					name: createDto.name,
					description: createDto.description,
					userId,
				},
			});

			return this.toDto(searchSpace);
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to create search space: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		skip: number = 0,
		limit: number = 200,
	): Promise<SearchSpaceDto[]> {
		try {
			const searchSpaces = await this.prisma.searchSpace.findMany({
				where: { userId },
				skip,
				take: limit,
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			return searchSpaces.map((ss) => this.toDto(ss));
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch search spaces: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<SearchSpaceDto> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id, userId },
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			if (!searchSpace) {
				throw new NotFoundException("Search space not found");
			}

			return this.toDto(searchSpace);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch search space: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateSearchSpaceDto,
		userId: string,
	): Promise<SearchSpaceDto> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id, userId },
			});

			if (!searchSpace) {
				throw new NotFoundException("Search space not found");
			}

			const updated = await this.prisma.searchSpace.update({
				where: { id },
				data: {
					name: updateDto.name,
					description: updateDto.description,
				},
				include: { pinnedQueryTemplates: { select: { queryTemplateId: true } } },
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update search space: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const searchSpace = await this.prisma.searchSpace.findFirst({
				where: { id, userId },
			});

			if (!searchSpace) {
				throw new NotFoundException("Search space not found");
			}

			await this.prisma.searchSpace.delete({
				where: { id },
			});

			return { message: "Search space deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete search space: ${error.message}`,
			);
		}
	}

	private toDto(searchSpace: any): SearchSpaceDto {
		const pinnedIds = (searchSpace.pinnedQueryTemplates ?? []).map(
			(p) => p.queryTemplateId,
		);
		return {
			id: searchSpace.id,
			name: searchSpace.name,
			description: searchSpace.description,
			userId: searchSpace.userId,
			pinned_query_template_ids: pinnedIds,
			created_at: searchSpace.createdAt,
		};
	}
}
