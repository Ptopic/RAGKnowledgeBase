import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	NotebookDto,
	NotebookListItemDto,
	CreateNotebookDto,
	UpdateNotebookDto,
} from "./dtos/notebook.dto";

@Injectable()
export class NotebooksService {
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

	private async generateSlug(title: string): Promise<string> {
		const base = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 80);
		const suffix = Math.random().toString(36).slice(2, 8);
		const slug = `${base}-${suffix}`;
		const existing = await this.prisma.notebook.findUnique({ where: { slug } });
		if (existing) return this.generateSlug(title);
		return slug;
	}

	async create(
		createDto: CreateNotebookDto,
		userId: string,
	): Promise<NotebookDto> {
		try {
			await this.checkSearchSpaceOwnership(createDto.search_space_id, userId);

			const slug = await this.generateSlug(createDto.title);

			const notebook = await this.prisma.notebook.create({
				data: {
					title: createDto.title,
					slug,
					content: createDto.content,
					contentType: createDto.contentType || "html",
					excerpt: createDto.excerpt,
					searchSpaceId: createDto.search_space_id,
					authorId: userId,
				},
			});

			return this.toDto(notebook);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create notebook: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		searchSpaceId: number,
		skip: number = 0,
		limit: number = 100,
	): Promise<NotebookListItemDto[]> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			await this.checkSearchSpaceOwnership(searchSpaceId, userId);

			const notebooks = await this.prisma.notebook.findMany({
				where: {
					searchSpaceId,
					searchSpace: { userId },
				},
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					title: true,
					slug: true,
					contentType: true,
					excerpt: true,
					authorId: true,
					searchSpaceId: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return notebooks.map((notebook) => this.toListItemDto(notebook));
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch notebooks: ${error.message}`,
			);
		}
	}

	async findOne(notebookId: number, userId: string): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			return this.toDto(notebook);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch notebook: ${error.message}`,
			);
		}
	}

	async update(
		notebookId: number,
		updateDto: UpdateNotebookDto,
		userId: string,
	): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			const updated = await this.prisma.notebook.update({
				where: { id: notebookId },
				data: {
					title: updateDto.title,
					content: updateDto.content,
					contentType: updateDto.contentType,
					excerpt: updateDto.excerpt,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update notebook: ${error.message}`,
			);
		}
	}

	async remove(notebookId: number, userId: string): Promise<{ message: string }> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.prisma.notebook.delete({
				where: { id: notebookId },
			});

			return { message: "Notebook deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete notebook: ${error.message}`,
			);
		}
	}

	private toDto(notebook: any): NotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			contentType: notebook.contentType,
			excerpt: notebook.excerpt,
			search_space_id: notebook.searchSpaceId,
			author_id: notebook.authorId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toListItemDto(notebook: any): NotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			contentType: notebook.contentType,
			excerpt: notebook.excerpt,
			author_id: notebook.authorId,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}
}
