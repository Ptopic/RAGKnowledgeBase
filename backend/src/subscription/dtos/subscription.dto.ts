import { IsString, IsNotEmpty, IsIn } from "class-validator";

export class CreateCheckoutSessionDto {
	@IsString()
	@IsNotEmpty()
	@IsIn(["FREE", "PRO", "BUSINESS"])
	plan: string;
}
