import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdatePreferencesDto {
	@IsString()
	@IsOptional()
	@MaxLength(50)
	preferred_language?: string;
}
