import {
	IsBoolean,
	IsEmail,
	IsIn,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from "class-validator";
import { SubscriptionPlan } from "@prisma/client";

export class CreateAdminUserDto {
	@IsEmail()
	email: string;

	@IsString()
	@IsOptional()
	@MaxLength(255)
	fullName?: string;

	@IsString()
	@IsOptional()
	@MinLength(8)
	password?: string;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsBoolean()
	@IsOptional()
	isSuperuser?: boolean;
}

export class UpdateAdminUserDto {
	@IsString()
	@IsOptional()
	@MaxLength(255)
	fullName?: string;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsBoolean()
	@IsOptional()
	isSuperuser?: boolean;

	@IsBoolean()
	@IsOptional()
	isVerified?: boolean;
}

export class AdminUserDto {
	id: string;
	email: string;
	fullName: string | null;
	isActive: boolean;
	isSuperuser: boolean;
	isVerified: boolean;
	failedLoginAttempts: number;
	lockedUntil: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class AdminUserListDto {
	users: AdminUserDto[];
	total: number;
}

export class AdminMetricsDto {
	totalUsers: number;
	activeUsers: number;
	superusers: number;
	totalSearchSpaces: number;
	totalDocuments: number;
	totalChats: number;
	userUsage: AdminUserDto[];
	userUsageTotal: number;
}

// Admin Subscription DTOs

export class OverridePlanDto {
	@IsIn(Object.values(SubscriptionPlan), {
		message: `plan must be one of: ${Object.values(SubscriptionPlan).join(", ")}`,
	})
	plan: SubscriptionPlan;
}

export class AdminSubscriptionUserDto {
	id: string;
	email: string;
	full_name: string | null;
	plan: string;
	status: string;
	credits_used: number;
	monthly_credit_limit: number;
	stripe_customer_id: string | null;
}

export class AdminSubscriptionListDto {
	users: AdminSubscriptionUserDto[];
	total: number;
	active_subscriptions: number;
	total_revenue: string;
	free_tier_count: number;
}
