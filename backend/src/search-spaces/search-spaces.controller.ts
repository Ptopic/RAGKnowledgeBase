import {
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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { MemberRole } from "@prisma/client";
import {
	CreateSearchSpaceDto,
	SearchSpaceDto,
	UpdateSearchSpaceDto,
} from "./dtos/search-space.dto";
import { InviteMemberDto, InviteResponseDto, MemberDto, UpdateMemberRoleDto } from "./dtos/member.dto";
import { SearchSpacesService } from "./search-spaces.service";

@Controller("searchspaces")
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class SearchSpacesController {
	constructor(private readonly searchSpacesService: SearchSpacesService) {}

	@Post()
	async create(
		@Body() createDto: CreateSearchSpaceDto,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.create(createDto, req.user.id);
	}

	@Get()
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
	): Promise<SearchSpaceDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 200;
		return this.searchSpacesService.findAll(req.user.id, skipNum, limitNum);
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
	@RequireSearchSpaceRole(MemberRole.EDITOR)
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
	@RequireSearchSpaceRole(MemberRole.OWNER)
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
