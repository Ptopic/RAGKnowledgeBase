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
import { LLMConfigsService } from './llm-configs.service';
import {
  CreateLLMConfigDto,
  UpdateLLMConfigDto,
  LLMConfigDto,
  LLMPreferencesUpdateDto,
  LLMPreferencesDto,
} from '../dtos/llm-config.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class LLMConfigsController {
  constructor(private readonly llmConfigsService: LLMConfigsService) {}

  @Post('llm-configs')
  async create(
    @Body() createDto: CreateLLMConfigDto,
    @Req() req: any,
  ): Promise<LLMConfigDto> {
    return this.llmConfigsService.create(createDto, req.user.id);
  }

  @Get('llm-configs')
  async findAll(
    @Req() req: any,
    @Query('search_space_id') searchSpaceId: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ): Promise<LLMConfigDto[]> {
    if (!searchSpaceId) {
      throw new BadRequestException('search_space_id query parameter is required');
    }
    const searchSpaceIdNum = parseInt(searchSpaceId, 10);
    const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 200;
    return this.llmConfigsService.findAll(searchSpaceIdNum, req.user.id, skipNum, limitNum);
  }

  @Get('llm-configs/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<LLMConfigDto> {
    return this.llmConfigsService.findOne(id, req.user.id);
  }

  @Put('llm-configs/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLLMConfigDto,
    @Req() req: any,
  ): Promise<LLMConfigDto> {
    return this.llmConfigsService.update(id, updateDto, req.user.id);
  }

  @Delete('llm-configs/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.llmConfigsService.remove(id, req.user.id);
  }

  @Get('search-spaces/:searchSpaceId/llm-preferences')
  async getUserLLMPreferences(
    @Param('searchSpaceId', ParseIntPipe) searchSpaceId: number,
    @Req() req: any,
  ): Promise<LLMPreferencesDto> {
    return this.llmConfigsService.getUserLLMPreferences(searchSpaceId, req.user.id);
  }

  @Put('search-spaces/:searchSpaceId/llm-preferences')
  async updateUserLLMPreferences(
    @Param('searchSpaceId', ParseIntPipe) searchSpaceId: number,
    @Body() preferencesDto: LLMPreferencesUpdateDto,
    @Req() req: any,
  ): Promise<LLMPreferencesDto> {
    return this.llmConfigsService.updateUserLLMPreferences(
      searchSpaceId,
      preferencesDto,
      req.user.id,
    );
  }
}
