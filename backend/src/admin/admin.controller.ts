import {
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
import {
	AdminMetricsDto,
	AdminUserDto,
	AdminUserListDto,
	CreateAdminUserDto,
	UpdateAdminUserDto,
} from "./dtos/admin.dto";
import { AdminService } from "./admin.service";

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
}
