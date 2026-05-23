import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { LogLevel, LogStatus, MemberRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { CreateLogDto, LogDto, UpdateLogDto } from "./dtos/log.dto";
import { LogsService } from "./logs.service";

@Controller("logs")
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class LogsController {
	constructor(private readonly logsService: LogsService) {}

	@Post()
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async create(
		@Body() createDto: CreateLogDto,
		@Req() req: any,
	): Promise<LogDto> {
		return this.logsService.create(createDto, req.user.id);
	}

	@Get()
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("level") level?: LogLevel,
		@Query("status") status?: LogStatus,
		@Query("source") source?: string,
		@Query("start_date") startDate?: string,
		@Query("end_date") endDate?: string,
	): Promise<LogDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		const startDateObj = startDate ? new Date(startDate) : undefined;
		const endDateObj = endDate ? new Date(endDate) : undefined;

		return this.logsService.findAll(
			req.user.id,
			skipNum,
			limitNum,
			req.searchSpaceContext.searchSpaceId,
			level,
			status,
			source,
			startDateObj,
			endDateObj,
		);
	}

	@Get("search-space/:searchSpaceId/summary")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async getLogsSummary(
		@Param("searchSpaceId", ParseIntPipe) searchSpaceId: number,
		@Req() req: any,
		@Query("hours") hours?: string,
	): Promise<any> {
		const hoursNum = hours !== undefined ? parseInt(hours, 10) : 24;
		return this.logsService.getLogsSummary(
			searchSpaceId,
			req.user.id,
			hoursNum,
		);
	}

	@Get(":id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<LogDto> {
		return this.logsService.findOne(id, req.user.id);
	}

	@Put(":id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateLogDto,
		@Req() req: any,
	): Promise<LogDto> {
		return this.logsService.update(id, updateDto, req.user.id);
	}

	@Delete(":id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.logsService.remove(id, req.user.id);
	}
}
