/**
 * Base DTOs for common fields
 */

import { IsDate, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class TimestampDto {
  @IsDate()
  @Type(() => Date)
  createdAt: Date;
}

export class IDDto {
  @IsInt()
  id: number;
}
