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
import { SearchSpacesService } from './search-spaces.service';
import {
  CreateSearchSpaceDto,
  UpdateSearchSpaceDto,
  SearchSpaceDto,
} from '../dtos/search-space.dto';

@Controller('searchspaces')
@UseGuards(JwtAuthGuard)
export class SearchSpacesController {
  constructor(private readonly searchSpacesService: SearchSpacesService) {}

  @Post()
  async create(
    @Body() createDto: CreateSearchSpaceDto,
    @Req() req: any,
  ): Promise<SearchSpaceDto> {
    return this.searchSpacesService.create(createDto, req.user.id);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ): Promise<SearchSpaceDto[]> {
    const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 200;
    return this.searchSpacesService.findAll(req.user.id, skipNum, limitNum);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<SearchSpaceDto> {
    return this.searchSpacesService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSearchSpaceDto,
    @Req() req: any,
  ): Promise<SearchSpaceDto> {
    return this.searchSpacesService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.searchSpacesService.remove(id, req.user.id);
  }
}
