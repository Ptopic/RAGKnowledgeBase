/**
 * Chunk DTOs
 */

import { Type } from "class-transformer";
import { IsDate, IsInt, IsString } from "class-validator";

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
	created_at: Date;
}
