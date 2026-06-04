export interface AdminUser {
	id: string;
	email: string;
	fullName: string | null;
	isActive: boolean;
	isSuperuser: boolean;
	isVerified: boolean;
	failedLoginAttempts: number;
	lockedUntil: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AdminUserList {
	users: AdminUser[];
	total: number;
}

export interface CreateAdminUser {
	email: string;
	fullName?: string;
	password?: string;
	isActive?: boolean;
	isSuperuser?: boolean;
}

export interface UpdateAdminUser {
	fullName?: string;
	isActive?: boolean;
	isSuperuser?: boolean;
	isVerified?: boolean;
}

export interface AdminMetrics {
	totalUsers: number;
	activeUsers: number;
	superusers: number;
	totalSearchSpaces: number;
	totalDocuments: number;
	totalChats: number;
	userUsage: AdminUser[];
	userUsageTotal: number;
}
