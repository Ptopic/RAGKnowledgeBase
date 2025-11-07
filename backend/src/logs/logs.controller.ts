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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { LogsService } from './logs.service';
import { LogLevel, LogStatus } from '@prisma/client';
import { CreateLogDto, UpdateLogDto, LogDto } from '../dtos/log.dto';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  async create(
    @Body() createDto: CreateLogDto,
    @Req() req: any,
  ): Promise<LogDto> {
    return this.logsService.create(createDto, req.user.id);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search_space_id') searchSpaceId?: string,
    @Query('level') level?: LogLevel,
    @Query('status') status?: LogStatus,
    @Query('source') source?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<LogDto[]> {
    const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.logsService.findAll(
      req.user.id,
      skipNum,
      limitNum,
      searchSpaceIdNum,
      level,
      status,
      source,
      startDateObj,
      endDateObj,
    );
  }

  @Get('search-space/:searchSpaceId/summary')
  async getLogsSummary(
    @Param('searchSpaceId', ParseIntPipe) searchSpaceId: number,
    @Req() req: any,
    @Query('hours') hours?: string,
  ): Promise<any> {
    const hoursNum = hours !== undefined ? parseInt(hours, 10) : 24;
    return this.logsService.getLogsSummary(searchSpaceId, req.user.id, hoursNum);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<LogDto> {
    return this.logsService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLogDto,
    @Req() req: any,
  ): Promise<LogDto> {
    return this.logsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.logsService.remove(id, req.user.id);
  }
}
