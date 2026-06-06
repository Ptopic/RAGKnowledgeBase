import { IsString, IsNotEmpty } from "class-validator";
import { SubscriptionPlan } from "@prisma/client";

export class CreateCheckoutSessionDto {
	@IsString()
	@IsNotEmpty()
	plan: string;
}

export interface PlanCreditLimitDto {
	plan: SubscriptionPlan;
	monthly_credit_limit: number;
}

export interface PlanCreditLimitsResponseDto {
	plans: PlanCreditLimitDto[];
}
