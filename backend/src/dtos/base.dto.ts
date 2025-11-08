/**
 * Base DTOs for common fields
 */

import { Type } from "class-transformer";
import { IsDate, IsInt } from "class-validator";

export class TimestampDto {
	@IsDate()
	@Type(() => Date)
	created_at: Date;
}

export class IDDto {
	@IsInt()
	id: number;
}
