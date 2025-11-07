import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { SearchSourceConnectorsService } from './search-source-connectors.service';
import {
  CreateSearchSourceConnectorDto,
  UpdateSearchSourceConnectorDto,
  SearchSourceConnectorDto,
  GitHubPATRequestDto,
} from '../dtos/search-source-connector.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class SearchSourceConnectorsController {
  constructor(
    private readonly connectorsService: SearchSourceConnectorsService,
  ) {}

  @Post('github/repositories')
  async listGitHubRepositories(
    @Body() patRequest: GitHubPATRequestDto,
    @Req() req: any,
  ): Promise<any[]> {
    return [];
  }

  @Post('search-source-connectors')
  async create(
    @Body() createDto: CreateSearchSourceConnectorDto,
    @Query('search_space_id', ParseIntPipe) searchSpaceId: number,
    @Req() req: any,
  ): Promise<SearchSourceConnectorDto> {
    if (!searchSpaceId) {
      throw new BadRequestException('search_space_id query parameter is required');
    }
    return this.connectorsService.create(createDto, searchSpaceId, req.user.id);
  }

  @Get('search-source-connectors')
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search_space_id') searchSpaceId?: string,
  ): Promise<SearchSourceConnectorDto[]> {
    const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;
    return this.connectorsService.findAll(
      req.user.id,
      skipNum,
      limitNum,
      searchSpaceIdNum,
    );
  }

  @Get('search-source-connectors/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<SearchSourceConnectorDto> {
    return this.connectorsService.findOne(id, req.user.id);
  }

  @Put('search-source-connectors/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSearchSourceConnectorDto,
    @Req() req: any,
  ): Promise<SearchSourceConnectorDto> {
    return this.connectorsService.update(id, updateDto, req.user.id);
  }

  @Delete('search-source-connectors/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.connectorsService.remove(id, req.user.id);
  }

  @Post('search-source-connectors/:id/index')
  async indexConnectorContent(
    @Param('id', ParseIntPipe) id: number,
    @Query('search_space_id', ParseIntPipe) searchSpaceId: number,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Req() req?: any,
  ): Promise<any> {
    if (!searchSpaceId) {
      throw new BadRequestException('search_space_id query parameter is required');
    }
    return this.connectorsService.indexConnectorContent(
      id,
      searchSpaceId,
      req.user.id,
      startDate,
      endDate,
    );
  }
}
