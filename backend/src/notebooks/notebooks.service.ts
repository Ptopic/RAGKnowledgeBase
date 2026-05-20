import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { Notebook as PrismaNotebook } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload";
import {
	NotebookDto,
	NotebookListItemDto,
	PublicNotebookDto,
	PublicNotebookListItemDto,
	CreateNotebookDto,
	UpdateNotebookDto,
} from "./dtos/notebook.dto";

@Injectable()
export class NotebooksService {
	constructor(
		private prisma: PrismaService,
		private uploadService: UploadService,
	) {}

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

	private async generateSlug(title: string, attempt = 0): Promise<string> {
		if (attempt > 10) throw new InternalServerErrorException("Failed to generate unique slug");

		const base = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 80) || "notebook";
		const suffix = Math.random().toString(36).slice(2, 8);
		const slug = `${base}-${suffix}`;
		const existing = await this.prisma.notebook.findUnique({ where: { slug } });
		if (existing) return this.generateSlug(title, attempt + 1);
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
					excerpt: true,
					isPublished: true,
					publishedAt: true,
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

	async findOne(notebookId: number, searchSpaceId: number, userId: string): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
				include: { author: { select: { fullName: true, picture: true } } },
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
		searchSpaceId: number,
		updateDto: UpdateNotebookDto,
		userId: string,
	): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
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
				excerpt: updateDto.excerpt,
			},
			include: { author: { select: { fullName: true, picture: true } } },
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

	async remove(notebookId: number, searchSpaceId: number, userId: string): Promise<{ message: string }> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			await this.uploadService.deleteAllFromContent(notebook.content);
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

	async publish(notebookId: number, searchSpaceId: number, userId: string): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			if (notebook.isPublished) {
				throw new BadRequestException("Notebook is already published");
			}

		const updated = await this.prisma.notebook.update({
			where: { id: notebookId },
			data: {
				isPublished: true,
				publishedAt: new Date(),
			},
			include: { author: { select: { fullName: true, picture: true } } },
		});

		return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to publish notebook: ${error.message}`,
			);
		}
	}

	async unpublish(notebookId: number, searchSpaceId: number, userId: string): Promise<NotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findFirst({
				where: {
					id: notebookId,
					searchSpaceId,
					searchSpace: { userId },
				},
			});

			if (!notebook) {
				throw new NotFoundException(
					"Notebook not found or you do not have permission to access it",
				);
			}

			if (!notebook.isPublished) {
				throw new BadRequestException("Notebook is not published");
			}

		const updated = await this.prisma.notebook.update({
			where: { id: notebookId },
			data: {
				isPublished: false,
				publishedAt: null,
			},
			include: { author: { select: { fullName: true, picture: true } } },
		});

		return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to unpublish notebook: ${error.message}`,
			);
		}
	}

	// Public methods (no auth)
	async findPublishedNotebooks(
		searchSpaceId?: number,
		skip: number = 0,
		limit: number = 100,
	): Promise<{ items: PublicNotebookListItemDto[]; total: number }> {
		try {
			const where: any = { isPublished: true };
			if (searchSpaceId) {
				where.searchSpaceId = searchSpaceId;
			}

			const [notebooks, total] = await Promise.all([
				this.prisma.notebook.findMany({
					where,
					orderBy: { publishedAt: "desc" },
					skip,
					take: limit,
					select: {
						id: true,
						title: true,
						slug: true,
						excerpt: true,
						publishedAt: true,
						authorId: true,
						searchSpaceId: true,
						createdAt: true,
						updatedAt: true,
						author: { select: { fullName: true, picture: true } },
					},
				}),
				this.prisma.notebook.count({ where }),
			]);

			return {
				items: notebooks.map((n) => this.toPublicListItemDto(n)),
				total,
			};
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to fetch published notebooks: ${error.message}`,
			);
		}
	}

	async findPublishedBySlug(slug: string): Promise<PublicNotebookDto> {
		try {
			const notebook = await this.prisma.notebook.findUnique({
				where: { slug },
				include: { author: { select: { fullName: true, picture: true } } },
			});

			if (!notebook || !notebook.isPublished) {
				throw new NotFoundException("Published notebook not found");
			}

			return this.toPublicDto(notebook);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch published notebook: ${error.message}`,
			);
		}
	}

	private toDto(notebook: PrismaNotebook & { author?: { fullName: string | null; picture: string | null } | null }): NotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			excerpt: notebook.excerpt,
			is_published: notebook.isPublished,
			published_at: notebook.publishedAt,
			search_space_id: notebook.searchSpaceId,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toListItemDto(notebook: any): NotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			excerpt: notebook.excerpt,
			is_published: notebook.isPublished,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toPublicListItemDto(notebook: any): PublicNotebookListItemDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			excerpt: notebook.excerpt,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}

	private toPublicDto(notebook: any): PublicNotebookDto {
		return {
			id: notebook.id,
			title: notebook.title,
			slug: notebook.slug,
			content: notebook.content,
			excerpt: notebook.excerpt,
			published_at: notebook.publishedAt,
			author_id: notebook.authorId,
			author_name: notebook.author?.fullName ?? null,
			author_picture: notebook.author?.picture ?? null,
			search_space_id: notebook.searchSpaceId,
			created_at: notebook.createdAt,
			updated_at: notebook.updatedAt,
		};
	}
}
