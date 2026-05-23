import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsNotIn, IsString, IsUUID } from "class-validator";
import { MemberRole } from "@prisma/client";

export class InviteMemberDto {
	@IsEmail()
	email: string;

	@IsEnum(MemberRole)
	@IsNotIn([MemberRole.OWNER])
	role: MemberRole;
}

export class UpdateMemberRoleDto {
	@IsEnum(MemberRole)
	@IsNotIn([MemberRole.OWNER])
	role: MemberRole;
}

export class InviteResponseDto {
	@IsString()
	message: string;
}

export class MemberDto {
	@IsUUID()
	id: string;

	@IsUUID()
	user_id: string;

	@IsString()
	email: string;

	@IsString()
	full_name: string | null;

	@IsString()
	picture: string | null;

	@IsEnum(MemberRole)
	role: MemberRole;

	@IsUUID()
	invited_by_id: string;

	@Type(() => Date)
	created_at: Date;
}
