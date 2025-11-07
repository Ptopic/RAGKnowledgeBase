/**
 * Chunk DTOs
 */

import { IsString, IsInt, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class ChunkBaseDto {
  @IsString()
  content: string;

  @IsInt()
  documentId: number;
}

export class CreateChunkDto extends ChunkBaseDto {}

export class UpdateChunkDto extends ChunkBaseDto {}

export class ChunkDto extends ChunkBaseDto {
  @IsInt()
  id: number;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;
}
