import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyDto } from './dtos/api-key.dto';

@Controller('settings/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async upsert(
    @Body() createDto: CreateApiKeyDto,
    @Req() req: { user: { id: string } },
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.upsert(req.user.id, createDto);
  }

  @Get()
  async findAll(@Req() req: { user: { id: string } }): Promise<ApiKeyDto[]> {
    return this.apiKeysService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @Req() req: { user: { id: string } },
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ): Promise<{ message: string }> {
    return this.apiKeysService.remove(id, req.user.id);
  }
}
