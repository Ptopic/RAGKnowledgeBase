import { LogLevel, LogStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsObject, IsOptional, IsString } from "class-validator";

export class LogBaseDto {
	@IsEnum(LogLevel)
	level: LogLevel;

	@IsEnum(LogStatus)
	status: LogStatus;

	@IsString()
	message: string;

	@IsString()
	@IsOptional()
	source?: string;

	@IsObject()
	@IsOptional()
	log_metadata?: Record<string, any>;
}

export class CreateLogDto extends LogBaseDto {
	@IsInt()
	search_space_id: number;
}

export class UpdateLogDto {
	@IsEnum(LogLevel)
	@IsOptional()
	level?: LogLevel;

	@IsEnum(LogStatus)
	@IsOptional()
	status?: LogStatus;

	@IsString()
	@IsOptional()
	message?: string;

	@IsString()
	@IsOptional()
	source?: string;

	@IsObject()
	@IsOptional()
	log_metadata?: Record<string, any>;
}

export class LogDto extends LogBaseDto {
	@IsInt()
	id: number;

	@IsInt()
	search_space_id: number;

	@Type(() => Date)
	created_at: Date;
}
