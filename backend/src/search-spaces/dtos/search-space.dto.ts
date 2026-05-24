import { Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
} from "class-validator";
import { MemberRole } from "@prisma/client";

export class CreateSearchSpaceDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;
}

export class UpdateSearchSpaceDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;
}

export class SearchSpaceDto {
	@IsInt()
	id: number;

	@IsUUID()
	userId: string;

	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsArray()
	@IsInt({ each: true })
	pinned_query_template_ids: number[];

	@Type(() => Date)
	created_at: Date;

	@IsEnum(MemberRole)
	role: MemberRole | null;

	@IsBoolean()
	is_owner: boolean;
}
