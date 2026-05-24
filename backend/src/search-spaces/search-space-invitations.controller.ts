import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Req,
	UseGuards,
	ParseIntPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { MemberRole } from "@prisma/client";
import {
	CreateInvitationDto,
	InvitationResponseDto,
} from "./dtos/invitation.dto";
import { SearchSpaceInvitationsService } from "./search-space-invitations.service";

@Controller("searchspaces")
export class SearchSpaceInvitationsController {
	constructor(
		private readonly invitationsService: SearchSpaceInvitationsService,
	) {}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post(":id/invitations")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async createInvite(
		@Param("id", ParseIntPipe) searchSpaceId: number,
		@Body() dto: CreateInvitationDto,
		@Req() req: any,
	): Promise<InvitationResponseDto> {
		return this.invitationsService.createInvite(
			req.user.id,
			searchSpaceId,
			dto,
		);
	}

	@Throttle({ default: { limit: 10, ttl: 900000 } })
	@Get(":id/invitations/pending")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async getPendingInvitations(
		@Param("id", ParseIntPipe) searchSpaceId: number,
	): Promise<InvitationResponseDto[]> {
		return this.invitationsService.getPendingInvitations(searchSpaceId);
	}

	@Throttle({ default: { limit: 10, ttl: 900000 } })
	@Delete(":id/invitations/:invitationId")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async cancelInvitation(
		@Param("id", ParseIntPipe) searchSpaceId: number,
		@Param("invitationId", ParseIntPipe) invitationId: number,
	): Promise<{ message: string }> {
		return this.invitationsService.cancelInvitation(invitationId, searchSpaceId);
	}

	@Throttle({ default: { limit: 10, ttl: 900000 } })
	@Get("invite/:token")
	async getInvitationByToken(
		@Param("token") token: string,
	): Promise<InvitationResponseDto> {
		return this.invitationsService.getInvitationByToken(token);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("invite/:token/accept")
	@UseGuards(JwtAuthGuard)
	async acceptInvitation(
		@Param("token") token: string,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.invitationsService.acceptInvitation(
			token,
			req.user.id,
		);
	}

	@Throttle({ default: { limit: 5, ttl: 900000 } })
	@Post("invite/:token/decline")
	@UseGuards(JwtAuthGuard)
	async declineInvitation(
		@Param("token") token: string,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.invitationsService.declineInvitation(
			token,
			req.user.id,
		);
	}

	@Throttle({ default: { limit: 10, ttl: 900000 } })
	@Get("invitations")
	@UseGuards(JwtAuthGuard)
	async getMyInvitations(
		@Req() req: any,
	): Promise<InvitationResponseDto[]> {
		return this.invitationsService.getMyInvitations(req.user.id);
	}
}
