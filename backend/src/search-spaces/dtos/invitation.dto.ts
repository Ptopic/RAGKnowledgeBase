import { IsEmail } from "class-validator";

export class CreateInvitationDto {
	@IsEmail()
	inviteeEmail: string;
}

export class InvitationResponseDto {
	id: number;
	searchSpaceId: number;
	inviterId: string;
	inviteeEmail: string;
	status: string;
	expiresAt: Date;
	createdAt: Date;
	searchSpaceName?: string;
	inviterName?: string;
}
