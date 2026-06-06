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
import { MemberRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { SearchSpaceAccessGuard } from "../permissions/guards/search-space-access.guard";
import { RequireSearchSpaceRole } from "../permissions/decorators/require-search-space-role.decorator";
import { RequiresCredits } from "../subscription/decorators/requires-credits.decorator";
import { CreditsRequiredGuard } from "../subscription/guards/credits-required.guard";
import {
	CreateSearchSourceConnectorDto,
	GitHubPATRequestDto,
	SearchSourceConnectorDto,
	UpdateSearchSourceConnectorDto,
} from "./dtos/search-source-connector.dto";
import { SearchSourceConnectorsService } from "./search-source-connectors.service";
@Controller()
@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard)
export class SearchSourceConnectorsController {
	constructor(
		private readonly connectorsService: SearchSourceConnectorsService,
	) {}

	@Post("github/repositories")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async listGitHubRepositories(
		@Body() patRequest: GitHubPATRequestDto,
		@Req() req: any,
	): Promise<any[]> {
		return [];
	}

	@Post("search-source-connectors")
	@UseGuards(CreditsRequiredGuard)
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	@RequiresCredits(1)
	async create(
		@Body() createDto: CreateSearchSourceConnectorDto,
		@Req() req: any,
	): Promise<SearchSourceConnectorDto> {
		return this.connectorsService.create(createDto, req.searchSpaceContext.searchSpaceId, req.user.id);
	}

	@Get("search-source-connectors")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findAll(
		@Req() req: any,
		@Query("skip") skip?: string,
		@Query("limit") limit?: string,
		@Query("name") name?: string,
	): Promise<SearchSourceConnectorDto[]> {
		const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
		const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
		return this.connectorsService.findAll(
			req.user.id,
			skipNum,
			limitNum,
			req.searchSpaceContext.searchSpaceId,
			name,
		);
	}

	@Get("search-source-connectors/:id")
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	async findOne(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<SearchSourceConnectorDto> {
		return this.connectorsService.findOne(id, req.user.id);
	}

	@Put("search-source-connectors/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body() updateDto: UpdateSearchSourceConnectorDto,
		@Req() req: any,
	): Promise<SearchSourceConnectorDto> {
		return this.connectorsService.update(id, updateDto, req.user.id);
	}

	@Delete("search-source-connectors/:id")
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	async remove(
		@Param("id", ParseIntPipe) id: number,
		@Req() req: any,
	): Promise<{ message: string }> {
		return this.connectorsService.remove(id, req.user.id);
	}

	@Post("search-source-connectors/:id/index")
	@UseGuards(CreditsRequiredGuard)
	@RequireSearchSpaceRole(MemberRole.EDITOR)
	@RequiresCredits(1)
	async indexConnectorContent(
		@Param("id", ParseIntPipe) id: number,
		@Query("search_space_id", ParseIntPipe) searchSpaceId: number,
		@Query("start_date") startDate?: string,
		@Query("end_date") endDate?: string,
		@Req() req?: any,
	): Promise<any> {
		return this.connectorsService.indexConnectorContent(
			id,
			searchSpaceId,
			req.user.id,
			startDate,
			endDate,
		);
	}
}
