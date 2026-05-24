import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LiteLLMProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../utils/encryption';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyDto } from './dtos/api-key.dto';
import { apiKeyCache } from './api-key-cache';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, createDto: CreateApiKeyDto): Promise<ApiKeyDto> {
    try {
      const encryptedKey = encrypt(createDto.api_key);

      const result = await this.prisma.userProviderApiKey.upsert({
        where: {
          uq_user_provider: {
            userId,
            provider: createDto.provider,
          },
        },
        create: {
          userId,
          provider: createDto.provider,
          name: createDto.name,
          apiKey: encryptedKey,
        },
        update: {
          name: createDto.name,
          apiKey: encryptedKey,
        },
      });

      return this.toDto(result);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to save API key: ${error.message}`,
      );
    }
  }

  async findAll(userId: string): Promise<ApiKeyDto[]> {
    try {
      const keys = await this.prisma.userProviderApiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return keys.map((key) => this.toDto(key));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch API keys: ${error.message}`,
      );
    }
  }

  async findOne(id: string, userId: string): Promise<ApiKeyDto> {
    try {
      const key = await this.prisma.userProviderApiKey.findFirst({
        where: { id, userId },
      });

      if (!key) {
        throw new NotFoundException('API key not found');
      }

      return this.toDto(key);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to fetch API key: ${error.message}`,
      );
    }
  }

  async getDecryptedKey(id: string, userId: string): Promise<string> {
    const key = await this.prisma.userProviderApiKey.findFirst({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return decrypt(key.apiKey);
  }

  async getDecryptedKeyByProvider(
    userId: string,
    provider: string,
  ): Promise<string> {
    const key = await this.prisma.userProviderApiKey.findFirst({
      where: { userId, provider: provider as LiteLLMProvider },
    });

    if (!key) {
      throw new NotFoundException(
        `No API key found for provider ${provider}`,
      );
    }

    return decrypt(key.apiKey);
  }

  async resolveApiKey(llmConfig: { id: number; apiKey: string; userProviderKeyId: string | null }, userId?: string): Promise<string> {
    if (llmConfig.userProviderKeyId) {
      const cached = apiKeyCache.get(llmConfig.userProviderKeyId);
      if (cached) return cached;

      const where: { id: string; userId?: string } = { id: llmConfig.userProviderKeyId };
      if (userId) where.userId = userId;

      const key = await this.prisma.userProviderApiKey.findFirst({
        where,
      });

      if (!key) {
        throw new NotFoundException('API key not found');
      }

      const decrypted = decrypt(key.apiKey);
      apiKeyCache.set(llmConfig.userProviderKeyId, decrypted);
      return decrypted;
    }

    const cacheKey = `config:${llmConfig.id}`;
    const cached = apiKeyCache.get(cacheKey);
    if (cached) return cached;

    const decrypted = decrypt(llmConfig.apiKey);
    apiKeyCache.set(cacheKey, decrypted);
    return decrypted;
  }

  invalidateConfigCache(configId: number): void {
    apiKeyCache.delete(`config:${configId}`);
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateApiKeyDto,
  ): Promise<ApiKeyDto> {
    try {
      const existing = await this.prisma.userProviderApiKey.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new NotFoundException('API key not found');
      }

      const data: { name?: string; apiKey?: string } = {};
      if (updateDto.name !== undefined) data.name = updateDto.name;
      if (updateDto.api_key !== undefined) data.apiKey = encrypt(updateDto.api_key);

      const updated = await this.prisma.userProviderApiKey.update({
        where: { id },
        data,
      });

      apiKeyCache.delete(id);

      return this.toDto(updated);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to update API key: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    try {
      const existing = await this.prisma.userProviderApiKey.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new NotFoundException('API key not found');
      }

      await this.prisma.userProviderApiKey.delete({
        where: { id },
      });

      apiKeyCache.delete(id);

      return { message: 'API key deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to delete API key: ${error.message}`,
      );
    }
  }

  private toDto(key: { id: string; provider: LiteLLMProvider; name: string; createdAt: Date }): ApiKeyDto {
    return {
      id: key.id,
      provider: key.provider,
      name: key.name,
      created_at: key.createdAt,
    };
  }
}
