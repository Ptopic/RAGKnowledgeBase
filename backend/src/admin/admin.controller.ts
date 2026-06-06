import {
	AdminMetricsDto,
	AdminPlanDefinitionDto,
	AdminPlanDefinitionListDto,
	AdminSubscriptionListDto,
	AdminUserDto,
	AdminUserListDto,
	CreateAdminUserDto,
	OverridePlanDto,
	UpdateAdminUserDto,
	UpdatePlanCreditsDto,
} from "./dtos/admin.dto";
import { AdminService } from "./admin.service";
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	Param,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SubscriptionPlan } from "@prisma/client";

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	private requireSuperuser(user: { isSuperuser: boolean }): void {
		if (!user.isSuperuser) {
			throw new ForbiddenException("Admin access required");
		}
	}

	@Get("users")
	async listUsers(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("search") search?: string,
	): Promise<AdminUserListDto> {
		this.requireSuperuser(req.user);
		return this.adminService.listUsers(
			skip ? parseInt(skip, 10) : 0,
			limit ? parseInt(limit, 10) : 50,
			search,
		);
	}

	@Post("users")
	async createUser(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Body() dto: CreateAdminUserDto,
	): Promise<AdminUserDto> {
		this.requireSuperuser(req.user);
		return this.adminService.createUser(req.user.id, dto);
	}

	@Put("users/:id")
	async updateUser(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("id") userId: string,
		@Body() dto: UpdateAdminUserDto,
	): Promise<AdminUserDto> {
		this.requireSuperuser(req.user);
		return this.adminService.updateUser(req.user.id, userId, dto);
	}

	@Delete("users/:id")
	async deleteUser(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("id") userId: string,
	): Promise<{ message: string }> {
		this.requireSuperuser(req.user);
		return this.adminService.deleteUser(req.user.id, userId);
	}

	@Put("users/:id/toggle-active")
	async toggleUserActive(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("id") userId: string,
	): Promise<AdminUserDto> {
		this.requireSuperuser(req.user);
		return this.adminService.toggleUserActive(req.user.id, userId);
	}

	@Get("metrics")
	async getMetrics(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("search") search?: string,
	): Promise<AdminMetricsDto> {
		this.requireSuperuser(req.user);
		return this.adminService.getMetrics(
			skip ? parseInt(skip, 10) : 0,
			limit ? parseInt(limit, 10) : 50,
			search,
		);
	}

	@Get("subscriptions")
	async listSubscriptions(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("search") search?: string,
	): Promise<AdminSubscriptionListDto> {
		this.requireSuperuser(req.user);
		return this.adminService.listSubscriptions(
			skip ? parseInt(skip, 10) : 0,
			limit ? parseInt(limit, 10) : 50,
			search,
		);
	}

	@Put("subscriptions/:id/plan")
	async overrideSubscriptionPlan(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("id") userId: string,
		@Body() dto: OverridePlanDto,
	): Promise<{ message: string }> {
		this.requireSuperuser(req.user);
		return this.adminService.overrideUserSubscriptionPlan(req.user.id, userId, dto.plan);
	}

	@Post("subscriptions/:id/reset-credits")
	async resetUserCredits(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("id") userId: string,
	): Promise<{ message: string }> {
		this.requireSuperuser(req.user);
		return this.adminService.resetUserCredits(req.user.id, userId);
	}

	@Get("subscription-plans")
	async listPlanDefinitions(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
	): Promise<AdminPlanDefinitionListDto> {
		this.requireSuperuser(req.user);
		return this.adminService.listPlanDefinitions();
	}

	@Put("subscription-plans/:plan/credits")
	async updatePlanCredits(
		@Req() req: { user: { id: string; isSuperuser: boolean } },
		@Param("plan") plan: string,
		@Body() dto: UpdatePlanCreditsDto,
	): Promise<AdminPlanDefinitionDto> {
		this.requireSuperuser(req.user);
		if (!Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
			throw new BadRequestException(
				`Invalid plan: ${plan}. Valid plans: ${Object.values(SubscriptionPlan).join(", ")}`,
			);
		}
		return this.adminService.updatePlanCredits(
			plan as SubscriptionPlan,
			dto,
			req.user.id,
		);
	}
}
