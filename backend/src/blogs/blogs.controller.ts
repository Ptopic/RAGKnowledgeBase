import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { BlogsService } from "./blogs.service";
import {
	BlogDto,
	BlogListItemDto,
	CreateBlogDto,
	UpdateBlogDto,
} from "./dtos/blog.dto";

@Controller("searchspaces")
@UseGuards(JwtAuthGuard)
export class BlogsController {
	constructor(private readonly blogsService: BlogsService) {}

	@Post(":searchSpaceId/blogs")
	async create(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Body() createDto: CreateBlogDto,
		@Req() req: any,
	): Promise<BlogDto> {
		createDto.search_space_id = searchSpaceId;
		return this.blogsService.create(createDto, req.user.id);
	}

	@Get(":searchSpaceId/blogs")
	async findAll(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<BlogListItemDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.blogsService.findAll(
			req.user.id,
			searchSpaceId,
			skipNum,
			limitNum,
		);
	}

	@Get(":searchSpaceId/blogs/:blogId")
	async findOne(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("blogId", ParseIntPipe) blogId: number,
		@Req() req: any,
	): Promise<BlogDto> {
		return this.blogsService.findOne(blogId, req.user.id);
	}

	@Put(":searchSpaceId/blogs/:blogId")
	async update(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("blogId", ParseIntPipe) blogId: number,
		@Body() updateDto: UpdateBlogDto,
		@Req() req: any,
	): Promise<BlogDto> {
		return this.blogsService.update(blogId, updateDto, req.user.id);
	}

	@Delete(":searchSpaceId/blogs/:blogId")
	async remove(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Param("blogId", ParseIntPipe) blogId: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.blogsService.remove(blogId, req.user.id);
	}
}
