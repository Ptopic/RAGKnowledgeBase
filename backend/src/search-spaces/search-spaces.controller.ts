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
import {
	CreateSearchSpaceDto,
	SearchSpaceDto,
	UpdateSearchSpaceDto,
} from "./dtos/search-space.dto";
import { InviteMemberDto, InviteResponseDto, MemberDto, UpdateMemberRoleDto } from "./dtos/member.dto";
import { SearchSpacesService } from "./search-spaces.service";

@Controller("searchspaces")
@UseGuards(JwtAuthGuard)
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
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.findOne(id, req.user.id);
	}

	@Put(":id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateSearchSpaceDto,
		@Req() req: any,
	): Promise<SearchSpaceDto> {
		return this.searchSpacesService.update(id, updateDto, req.user.id);
	}

	@Delete(":id")
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.remove(id, req.user.id);
	}

	@Post(":id/members")
	async inviteMember(
		@Param("id", ParseIntPipe) id: number,
		@Body() inviteDto: InviteMemberDto,
		@Req() req: any,
	): Promise<InviteResponseDto> {
		return this.searchSpacesService.inviteMember(id, inviteDto, req.user.id);
	}

	@Get(":id/members")
	async listMembers(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<MemberDto[]> {
		return this.searchSpacesService.listMembers(id, req.user.id);
	}

	@Delete(":id/members/leave")
	async leaveSearchSpace(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.leaveSearchSpace(id, req.user.id);
	}

	@Put(":id/members/:memberId")
	async updateMemberRole(
		@Param("id", ParseIntPipe) id: number,
		@Param("memberId") memberId: string,
		@Body() updateDto: UpdateMemberRoleDto,
		@Req() req: any,
	): Promise<MemberDto> {
		return this.searchSpacesService.updateMemberRole(id, memberId, updateDto, req.user.id);
	}

	@Delete(":id/members/:memberId")
	async removeMember(
		@Param("id", ParseIntPipe) id: number,
		@Param("memberId") memberId: string,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.searchSpacesService.removeMember(id, memberId, req.user.id);
	}
}
