import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "../subscription/subscription.service";
import {
	AdminMetricsDto,
	AdminPlanDefinitionDto,
	AdminPlanDefinitionListDto,
	AdminSubscriptionListDto,
	AdminSubscriptionUserDto,
	AdminUserDto,
	AdminUserListDto,
	CreateAdminUserDto,
	UpdateAdminUserDto,
	UpdatePlanCreditsDto,
} from "./dtos/admin.dto";

function getCurrentMonthBounds(): { start: Date; end: Date } {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
	return { start, end };
}

@Injectable()
export class AdminService {
	private readonly logger = new Logger(AdminService.name);

	constructor(
		private prisma: PrismaService,
		private subscriptionService: SubscriptionService,
	) {}

	private toDto(user: { id: string; email: string; fullName: string | null; isActive: boolean; isSuperuser: boolean; isVerified: boolean; failedLoginAttempts: number; lockedUntil: Date | null; createdAt: Date; updatedAt: Date }): AdminUserDto {
		return {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			isActive: user.isActive,
			isSuperuser: user.isSuperuser,
			isVerified: user.isVerified,
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

		const data: { email: string; fullName: string | null; isActive: boolean; isSuperuser: boolean; hashedPassword?: string } = {
			email: dto.email,
			fullName: dto.fullName ?? null,
			isActive: dto.isActive ?? true,
			isSuperuser: dto.isSuperuser ?? false,
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

		const data: Partial<{ fullName: string | null; isActive: boolean; isSuperuser: boolean; isVerified: boolean }> = {};
		if (dto.fullName !== undefined) data.fullName = dto.fullName;
		if (dto.isActive !== undefined) data.isActive = dto.isActive;
		if (dto.isSuperuser !== undefined) data.isSuperuser = dto.isSuperuser;
		if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;

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
			userUsage,
			userUsageTotal,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { isActive: true } }),
			this.prisma.user.count({ where: { isSuperuser: true } }),
			this.prisma.searchSpace.count(),
			this.prisma.document.count(),
			this.prisma.chat.count(),
			this.prisma.user.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
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
			userUsage: userUsage.map((u) => this.toDto(u)),
			userUsageTotal,
		};
	}

	async listSubscriptions(
		skip = 0,
		limit = 50,
		search?: string,
	): Promise<AdminSubscriptionListDto> {
		const where = search
			? {
					OR: [
						{ email: { contains: search, mode: "insensitive" as const } },
						{ fullName: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {};

		const [users, total, activeSubscriptions, paidSubscriptions] = await Promise.all([
			this.prisma.user.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: { subscription: true },
			}),
			this.prisma.user.count({ where }),
			this.prisma.subscription.count({
				where: { plan: { not: "FREE" }, status: "active" },
			}),
			this.prisma.subscription.count({
				where: { plan: { not: "FREE" } },
			}),
		]);

		const subscriptionUsers: AdminSubscriptionUserDto[] = users.map((u) => {
			const sub = u.subscription;
			return {
				id: u.id,
				email: u.email,
				full_name: u.fullName,
				plan: sub?.plan ?? "FREE",
				status: sub?.status ?? "active",
				credits_used: sub?.creditsUsed ?? 0,
				monthly_credit_limit: sub?.monthlyCreditLimit ?? 1000,
				stripe_customer_id: sub?.stripeCustomerId ?? null,
			};
		});

		const freeTierCount = total - paidSubscriptions;

		return {
			users: subscriptionUsers,
			total,
			active_subscriptions: activeSubscriptions,
			total_revenue: "N/A",
			free_tier_count: freeTierCount,
		};
	}

	async overrideUserSubscriptionPlan(
		_adminId: string,
		userId: string,
		plan: string,
	): Promise<{ message: string }> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { subscription: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const plans = await this.subscriptionService.getPlans();
		const validPlanNames = new Set(plans.map((p) => p.plan));
		validPlanNames.add("FREE");

		if (!validPlanNames.has(plan)) {
			const validList = [...validPlanNames].sort().join(", ");
			throw new BadRequestException(`Invalid plan: ${plan}. Valid plans: ${validList}`);
		}

		const creditLimit = await this.subscriptionService.getCreditLimitForPlan(plan);

		const { start, end } = getCurrentMonthBounds();
		await this.prisma.subscription.upsert({
			where: { userId },
			update: {
				plan: plan as SubscriptionPlan,
				monthlyCreditLimit: creditLimit,
				status: "active",
			},
			create: {
				userId,
				plan: plan as SubscriptionPlan,
				monthlyCreditLimit: creditLimit,
				creditsUsed: 0,
				status: "active",
				currentPeriodStart: start,
				currentPeriodEnd: end,
			},
		});

		return { message: "Subscription plan updated successfully" };
	}

	async resetUserCredits(
		_adminId: string,
		userId: string,
	): Promise<{ message: string }> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { subscription: true },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const { start, end } = getCurrentMonthBounds();

		await this.prisma.subscription.upsert({
			where: { userId },
			update: {
				creditsUsed: 0,
				currentPeriodStart: start,
				currentPeriodEnd: end,
			},
			create: {
				userId,
				plan: SubscriptionPlan.FREE,
				monthlyCreditLimit: await this.subscriptionService.getCreditLimitForPlan("FREE"),
				creditsUsed: 0,
				status: "active",
				currentPeriodStart: start,
				currentPeriodEnd: end,
			},
		});

		return { message: "Credits reset successfully" };
	}

	async listPlanDefinitions(): Promise<AdminPlanDefinitionListDto> {
		const allPlans = Object.values(SubscriptionPlan);
		const existing = await this.prisma.planDefinition.findMany();
		const existingPlans = new Set(existing.map((p) => p.plan));
		const missing = allPlans.filter((p) => !existingPlans.has(p));

		if (missing.length > 0) {
			await this.prisma.$transaction(
				missing.map((plan) =>
					this.prisma.planDefinition.upsert({
						where: { plan },
						update: {},
						create: { plan, monthlyCreditLimit: 1000 },
					}),
				),
			);
		}

		const plans = await this.prisma.planDefinition.findMany({
			orderBy: { plan: "asc" },
		});

		return {
			plans: plans.map((p) => this.toPlanDefinitionDto(p)),
		};
	}

	async updatePlanCredits(
		plan: SubscriptionPlan,
		dto: UpdatePlanCreditsDto,
		adminUserId: string,
	): Promise<AdminPlanDefinitionDto> {
		const result = await this.prisma.$transaction(async (tx) => {
			const updated = await tx.planDefinition.upsert({
				where: { plan },
				update: {
					monthlyCreditLimit: dto.monthlyCreditLimit,
					updatedByUserId: adminUserId,
				},
				create: {
					plan,
					monthlyCreditLimit: dto.monthlyCreditLimit,
					updatedByUserId: adminUserId,
				},
			});

			const subsResult = await tx.subscription.updateMany({
				where: { plan },
				data: { monthlyCreditLimit: dto.monthlyCreditLimit },
			});

			this.logger.log(
				`Plan ${plan} credit limit set to ${dto.monthlyCreditLimit} by admin ${adminUserId} — applied to ${subsResult.count} subscription(s)`,
			);

			return updated;
		});

		return this.toPlanDefinitionDto(result);
	}

	private toPlanDefinitionDto(plan: {
		plan: SubscriptionPlan;
		monthlyCreditLimit: number;
		createdAt: Date;
		updatedAt: Date;
		updatedByUserId: string | null;
	}): AdminPlanDefinitionDto {
		return {
			plan: plan.plan,
			monthly_credit_limit: plan.monthlyCreditLimit,
			created_at: plan.createdAt,
			updated_at: plan.updatedAt,
			updated_by_user_id: plan.updatedByUserId,
		};
	}
}
