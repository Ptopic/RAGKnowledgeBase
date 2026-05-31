import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import {
	AdminMetricsDto,
	AdminUserDto,
	AdminUserListDto,
	CreateAdminUserDto,
	UpdateAdminUserDto,
} from "./dtos/admin.dto";

@Injectable()
export class AdminService {
	constructor(private prisma: PrismaService) {}

	private toDto(user: { id: string; email: string; fullName: string | null; isActive: boolean; isSuperuser: boolean; isVerified: boolean; pagesUsed: number; pagesLimit: number; failedLoginAttempts: number; lockedUntil: Date | null; createdAt: Date; updatedAt: Date }): AdminUserDto {
		return {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			isActive: user.isActive,
			isSuperuser: user.isSuperuser,
			isVerified: user.isVerified,
			pagesUsed: user.pagesUsed,
			pagesLimit: user.pagesLimit,
			failedLoginAttempts: user.failedLoginAttempts,
			lockedUntil: user.lockedUntil,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}

	async listUsers(
		skip = 0,
		limit = 50,
		search?: string,
	): Promise<AdminUserListDto> {
		const where = search
			? {
					OR: [
						{ email: { contains: search, mode: "insensitive" as const } },
						{ fullName: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {};

		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			users: users.map((u) => this.toDto(u)),
			total,
		};
	}

	async createUser(
		_adminId: string,
		dto: CreateAdminUserDto,
	): Promise<AdminUserDto> {
		const existing = await this.prisma.user.findUnique({
			where: { email: dto.email },
		});

		if (existing) {
			throw new ConflictException("User with this email already exists");
		}

		const data: { email: string; fullName: string | null; isActive: boolean; isSuperuser: boolean; pagesLimit: number; hashedPassword?: string } = {
			email: dto.email,
			fullName: dto.fullName ?? null,
			isActive: dto.isActive ?? true,
			isSuperuser: dto.isSuperuser ?? false,
			pagesLimit: dto.pagesLimit ?? 500,
		};

		if (dto.password) {
			data.hashedPassword = await bcrypt.hash(dto.password, 10);
		}

		const user = await this.prisma.user.create({ data });
		return this.toDto(user);
	}

	async updateUser(
		adminId: string,
		userId: string,
		dto: UpdateAdminUserDto,
	): Promise<AdminUserDto> {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Prevent admin from removing their own superuser status
		if (adminId === userId && dto.isSuperuser === false) {
			throw new BadRequestException(
				"You cannot remove your own admin privileges",
			);
		}

		// Prevent admin from disabling themselves
		if (adminId === userId && dto.isActive === false) {
			throw new BadRequestException("You cannot disable your own account");
		}

		const data: Partial<{ fullName: string | null; isActive: boolean; isSuperuser: boolean; isVerified: boolean; pagesLimit: number }> = {};
		if (dto.fullName !== undefined) data.fullName = dto.fullName;
		if (dto.isActive !== undefined) data.isActive = dto.isActive;
		if (dto.isSuperuser !== undefined) data.isSuperuser = dto.isSuperuser;
		if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;
		if (dto.pagesLimit !== undefined) data.pagesLimit = dto.pagesLimit;

		const updated = await this.prisma.user.update({
			where: { id: userId },
			data,
		});

		return this.toDto(updated);
	}

	async deleteUser(
		adminId: string,
		userId: string,
	): Promise<{ message: string }> {
		if (adminId === userId) {
			throw new BadRequestException("You cannot delete your own account");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				_count: {
					select: {
						searchSpaces: true,
						chats: true,
						searchSourceConnectors: true,
					},
				},
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		// If user has dependent data, suggest disable instead
		const dependentCount =
			user._count.searchSpaces +
			user._count.chats +
			user._count.searchSourceConnectors;

		if (dependentCount > 0) {
			throw new BadRequestException(
				`Cannot delete user: they own ${user._count.searchSpaces} search space(s), ${user._count.chats} chat(s), and ${user._count.searchSourceConnectors} connector(s). Consider disabling the account instead.`,
			);
		}

		await this.prisma.user.delete({ where: { id: userId } });
		return { message: "User deleted successfully" };
	}

	async toggleUserActive(
		adminId: string,
		userId: string,
	): Promise<AdminUserDto> {
		if (adminId === userId) {
			throw new BadRequestException("You cannot disable your own account");
		}

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException("User not found");
		}

		const updated = await this.prisma.user.update({
			where: { id: userId },
			data: { isActive: !user.isActive },
		});

		return this.toDto(updated);
	}

	async getMetrics(
		skip = 0,
		limit = 50,
		search?: string,
	): Promise<AdminMetricsDto> {
		const where = search
			? {
					OR: [
						{ email: { contains: search, mode: "insensitive" as const } },
						{ fullName: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {};

		const [
			totalUsers,
			activeUsers,
			superusers,
			totalSearchSpaces,
			totalDocuments,
			totalChats,
			aggregatePages,
			userUsage,
			userUsageTotal,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { isActive: true } }),
			this.prisma.user.count({ where: { isSuperuser: true } }),
			this.prisma.searchSpace.count(),
			this.prisma.document.count(),
			this.prisma.chat.count(),
			this.prisma.user.aggregate({
				_sum: { pagesUsed: true, pagesLimit: true },
			}),
			this.prisma.user.findMany({
				where,
				skip,
				take: limit,
				orderBy: { pagesUsed: "desc" },
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			totalUsers,
			activeUsers,
			superusers,
			totalSearchSpaces,
			totalDocuments,
			totalChats,
			totalPagesUsed: aggregatePages._sum.pagesUsed ?? 0,
			totalPagesLimit: aggregatePages._sum.pagesLimit ?? 0,
			userUsage: userUsage.map((u) => this.toDto(u)),
			userUsageTotal,
		};
	}
}
