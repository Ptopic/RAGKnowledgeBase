import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
	ParseIntPipe,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MemberRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { UploadService } from "../upload";
import {
	CreateSearchSpaceDto,
	DeleteSearchSpaceImageDto,
	SearchSpaceDto,
	UpdateSearchSpaceDto,
} from "./dtos/search-space.dto";
import { InviteMemberDto, InviteResponseDto, MemberDto, UpdateMemberRoleDto } from "./dtos/member.dto";
import { SearchSpacesService } from "./search-spaces.service";

interface AuthenticatedRequest extends Request {
	user: { id: string };
	searchSpaceContext?: import("../permissions/guards/search-space-access.guard").SearchSpaceContext;
}

@Controller("searchspaces")
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class SearchSpacesController {
	constructor(
		private readonly searchSpacesService: SearchSpacesService,
		private readonly uploadService: UploadService,
	) {}

	@Post()
	async create(
		@Body() createDto: CreateSearchSpaceDto,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.create(createDto, req.user.id);
	}

	@Post("upload-image")
	@UseInterceptors(
		FileInterceptor("file", {
			limits: { fileSize: 5 * 1024 * 1024 },
		}),
	)
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Req() req: any,
	): Promise<{ url: string }> {
		if (!file) {
			throw new BadRequestException("No file uploaded");
		}
		if (!file.mimetype.startsWith("image/")) {
			throw new BadRequestException("Only image files are allowed");
		}

		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const ext = file.originalname.split(".").pop() || "png";
		const filename = `searchspace-${uniqueSuffix}.${ext}`;
		const result = await this.uploadService.upload(
			file.buffer,
			filename,
			"searchspaces",
			file.mimetype,
		);
		return { url: result.url };
	}

	@Delete("delete-image")
	async deleteImage(
		@Body() body: DeleteSearchSpaceImageDto,
		@Req() req: any,
	): Promise<{ message: string }> {
		if (!this.uploadService.isOwnedUrl(body.url)) {
			throw new BadRequestException("URL must point to application-managed storage");
		}
		await this.uploadService.delete(body.url);
		return { message: "Image deleted" };
	}

	@Get()
	async findAll(
		@Req() req: any,
		@Query("q") q?: string,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<SearchSpaceDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 200;
		if (q && q.trim().length > 100) {
			throw new BadRequestException("Search query too long (max 100 characters)");
		}
		return this.searchSpacesService.findAll(req.user.id, skipNum, limitNum, q);
	}

	@Get(":id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.findOne(id, req.searchSpaceContext.membership);
	}

	@Put(":id")
	@RequireSearchSpaceRole(MemberRole.OWNER)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateSearchSpaceDto,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.update(id, updateDto, req.searchSpaceContext.membership);
	}

	@Delete(":id")
	@RequireSearchSpaceRole(MemberRole.OWNER)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.remove(id, req.user.id);
	}

	@Post(":id/members")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async inviteMember(
		@Param("id", ParseIntPipe) id: number,
		@Body() inviteDto: InviteMemberDto,
		@Req() req: any,
	): Promise<InviteResponseDto> {
		return this.searchSpacesService.inviteMember(id, inviteDto, req.user.id);
	}

	@Get(":id/members")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async listMembers(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<MemberDto[]> {
		return this.searchSpacesService.listMembers(id);
	}

	@Delete(":id/members/leave")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async leaveSearchSpace(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.leaveSearchSpace(id, req.searchSpaceContext.membership);
	}

	@Put(":id/members/:memberId")
	@RequireSearchSpaceRole(MemberRole.OWNER)
	async updateMemberRole(
		@Param("id", ParseIntPipe) id: number,
		@Param("memberId") memberId: string,
		@Body() updateDto: UpdateMemberRoleDto,
		@Req() req: any,
	): Promise<MemberDto> {
		return this.searchSpacesService.updateMemberRole(id, memberId, updateDto);
	}

	@Delete(":id/members/:memberId")
	@RequireSearchSpaceRole(MemberRole.OWNER)
	async removeMember(
		@Param("id", ParseIntPipe) id: number,
		@Param("memberId") memberId: string,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.removeMember(id, memberId);
	}
}
