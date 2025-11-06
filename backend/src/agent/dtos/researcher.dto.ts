import { IsArray, IsEnum, IsInt, IsOptional, IsString } from "class-validator";

export enum SearchMode {
	CHUNKS = "CHUNKS",
	DOCUMENTS = "DOCUMENTS",
}

export class ResearcherDto {
	@IsString()
	user_query: string;

	@IsArray()
	@IsString({ each: true })
	connectors_to_search: string[];

	@IsString()
	user_id: string;

	@IsInt()
	search_space_id: number;

	@IsEnum(SearchMode)
	search_mode: SearchMode;

	@IsArray()
	@IsInt({ each: true })
	@IsOptional()
	document_ids_to_add_in_context?: number[];

	@IsString()
	@IsOptional()
	language?: string;

	@IsString()
	thread_id: string;

	@IsArray()
	@IsOptional()
	chat_history?: Array<{ role: string; content: string }>;
}
