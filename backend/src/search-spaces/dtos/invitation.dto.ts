import { IsEmail, MaxLength } from "class-validator";

export class CreateInvitationDto {
	@IsEmail()
	@MaxLength(255)
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
