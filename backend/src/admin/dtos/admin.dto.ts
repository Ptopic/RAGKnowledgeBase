import {
	IsBoolean,
	IsEmail,
	IsInt,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from "class-validator";

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

	@IsInt()
	@IsOptional()
	pagesLimit?: number;
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

	@IsInt()
	@IsOptional()
	pagesLimit?: number;
}

export class AdminUserDto {
	id: string;
	email: string;
	fullName: string | null;
	isActive: boolean;
	isSuperuser: boolean;
	isVerified: boolean;
	pagesUsed: number;
	pagesLimit: number;
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
	totalPagesUsed: number;
	totalPagesLimit: number;
	userUsage: AdminUserDto[];
	userUsageTotal: number;
}
