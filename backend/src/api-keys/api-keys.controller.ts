import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { PermissionsService } from '../permissions/permissions.service';

@Controller('settings/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  async upsert(
    @Body() createDto: CreateApiKeyDto,
    @Req() req: { user: { id: string } },
  ): Promise<ApiKeyDto> {
    await this.requireOwnerRole(req.user.id);
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
    await this.requireOwnerRole(req.user.id);
    return this.apiKeysService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ): Promise<{ message: string }> {
    await this.requireOwnerRole(req.user.id);
    return this.apiKeysService.remove(id, req.user.id);
  }

  private async requireOwnerRole(userId: string): Promise<void> {
    const spaces = await this.permissionsService.getSearchSpacesForUser(userId);
    const isOwner = spaces.some(space => space.is_owner);
    if (!isOwner) {
      throw new ForbiddenException('Only search space owners can manage API keys');
    }
  }
}
