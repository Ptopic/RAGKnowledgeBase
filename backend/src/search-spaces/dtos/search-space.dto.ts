import { Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUrl,
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

	@IsUrl()
	@IsOptional()
	@MaxLength(500)
	headline_image_url?: string | null;
}

export class UpdateSearchSpaceDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsUrl()
	@IsOptional()
	@MaxLength(500)
	headline_image_url?: string | null;
}

export class DeleteSearchSpaceImageDto {
	@IsUrl()
	@MaxLength(500)
	url: string;
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

	@IsString()
	@IsOptional()
	@MaxLength(500)
	headline_image_url?: string | null;

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
