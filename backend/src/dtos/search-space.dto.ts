import { IsString, IsOptional, MaxLength, IsUUID, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { IDDto, TimestampDto } from './base.dto';

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
  createdAt: Date;
}
