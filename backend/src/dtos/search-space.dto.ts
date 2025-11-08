import { Type } from "class-transformer";
import {
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
} from "class-validator";

export class SearchSpaceBaseDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string;
}

export class CreateSearchSpaceDto extends SearchSpaceBaseDto {}

export class UpdateSearchSpaceDto extends SearchSpaceBaseDto {}

export class SearchSpaceDto extends SearchSpaceBaseDto {
	@IsInt()
	id: number;

	@IsUUID()
	userId: string;

	@Type(() => Date)
	created_at: Date;
}
