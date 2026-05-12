import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateShareLinkDto {
	@IsInt()
	@IsOptional()
	expiresInDays?: number;
}

export class ShareLinkDto {
	@IsString()
	id: string;

	@IsString()
	slug: string;

	@IsString()
	url: string;

	@Type(() => Date)
	@IsOptional()
	expiresAt?: Date | null;

	@IsOptional()
	isActive?: boolean;

	@Type(() => Date)
	createdAt: Date;
}

export class SharedChatDto {
	@IsInt()
	id: number;

	@IsString()
	type: string;

	@IsString()
	title: string;

	messages: any[];

	@Type(() => Date)
	createdAt: Date;
}
