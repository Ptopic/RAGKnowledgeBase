import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
	BlogDto,
	BlogListItemDto,
	CreateBlogDto,
	UpdateBlogDto,
} from "./dtos/blog.dto";

@Injectable()
export class BlogsService {
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
		const existing = await this.prisma.blog.findUnique({ where: { slug } });
		if (existing) return this.generateSlug(title);
		return slug;
	}

	async create(
		createDto: CreateBlogDto,
		userId: string,
	): Promise<BlogDto> {
		try {
			await this.checkSearchSpaceOwnership(createDto.search_space_id, userId);

			const slug = await this.generateSlug(createDto.title);

			const blog = await this.prisma.blog.create({
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

			return this.toDto(blog);
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create blog: ${error.message}`,
			);
		}
	}

	async findAll(
		userId: string,
		searchSpaceId: number,
		skip: number = 0,
		limit: number = 100,
	): Promise<BlogListItemDto[]> {
		try {
			if (skip < 0) {
				throw new BadRequestException("skip must be a non-negative integer");
			}
			if (limit <= 0 || limit > 1000) {
				throw new BadRequestException("limit must be between 1 and 1000");
			}

			await this.checkSearchSpaceOwnership(searchSpaceId, userId);

			const blogs = await this.prisma.blog.findMany({
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

			return blogs.map((blog) => this.toListItemDto(blog));
		} catch (error) {
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch blogs: ${error.message}`,
			);
		}
	}

	async findOne(blogId: number, userId: string): Promise<BlogDto> {
		try {
			const blog = await this.prisma.blog.findFirst({
				where: {
					id: blogId,
					searchSpace: { userId },
				},
			});

			if (!blog) {
				throw new NotFoundException(
					"Blog not found or you do not have permission to access it",
				);
			}

			return this.toDto(blog);
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch blog: ${error.message}`,
			);
		}
	}

	async update(
		blogId: number,
		updateDto: UpdateBlogDto,
		userId: string,
	): Promise<BlogDto> {
		try {
			const blog = await this.prisma.blog.findFirst({
				where: {
					id: blogId,
					searchSpace: { userId },
				},
			});

			if (!blog) {
				throw new NotFoundException(
					"Blog not found or you do not have permission to access it",
				);
			}

			const updated = await this.prisma.blog.update({
				where: { id: blogId },
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
				`Failed to update blog: ${error.message}`,
			);
		}
	}

	async remove(blogId: number, userId: string): Promise<{ message: string }> {
		try {
			const blog = await this.prisma.blog.findFirst({
				where: {
					id: blogId,
					searchSpace: { userId },
				},
			});

			if (!blog) {
				throw new NotFoundException(
					"Blog not found or you do not have permission to access it",
				);
			}

			await this.prisma.blog.delete({
				where: { id: blogId },
			});

			return { message: "Blog deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete blog: ${error.message}`,
			);
		}
	}

	private toDto(blog: any): BlogDto {
		return {
			id: blog.id,
			title: blog.title,
			slug: blog.slug,
			content: blog.content,
			contentType: blog.contentType,
			excerpt: blog.excerpt,
			search_space_id: blog.searchSpaceId,
			author_id: blog.authorId,
			created_at: blog.createdAt,
			updated_at: blog.updatedAt,
		};
	}

	private toListItemDto(blog: any): BlogListItemDto {
		return {
			id: blog.id,
			title: blog.title,
			slug: blog.slug,
			contentType: blog.contentType,
			excerpt: blog.excerpt,
			author_id: blog.authorId,
			search_space_id: blog.searchSpaceId,
			created_at: blog.createdAt,
			updated_at: blog.updatedAt,
		};
	}
}
