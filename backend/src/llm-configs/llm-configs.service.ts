import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { LiteLLMProvider } from "@prisma/client";
import {
	CreateLLMConfigDto,
	LLMConfigDto,
	LLMPreferencesDto,
	LLMPreferencesUpdateDto,
	UpdateLLMConfigDto,
} from "./dtos/llm-config.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ApiKeysService } from "../api-keys/api-keys.service";
import { encrypt } from "../utils/encryption";

function maskApiKey(key: string): string {
	if (key.length <= 8) return `${key.slice(0, 2)}********${key.slice(-2)}`;
	return `${key.slice(0, 4)}********${key.slice(-4)}`;
}

@Injectable()
export class LLMConfigsService {
	constructor(
		private prisma: PrismaService,
		private apiKeysService: ApiKeysService,
	) {}

	private async ensureSearchSpaceAccess(
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		const [user, membership] = await Promise.all([
			this.prisma.user.findUnique({
				where: { id: userId },
				select: { isSuperuser: true },
			}),
			this.prisma.searchSpaceMember.findUnique({
				where: {
					uq_search_space_member: {
						searchSpaceId,
						userId,
					},
				},
			}),
		]);

		if (!user?.isSuperuser && !membership) {
			throw new ForbiddenException("You do not have access to this search space");
		}
	}

	async create(
		createDto: CreateLLMConfigDto,
		userId: string,
	): Promise<LLMConfigDto> {
		try {
			await this.ensureSearchSpaceAccess(createDto.search_space_id, userId);

			if (!createDto.is_platform_key && !createDto.api_key && !createDto.user_provider_key_id) {
				throw new BadRequestException(
					'Either api_key or user_provider_key_id must be provided',
				);
			}

			// Admin check: only admins can configure custom API keys
			if (!createDto.is_platform_key && (createDto.api_key || createDto.user_provider_key_id)) {
				const user = await this.prisma.user.findUnique({
					where: { id: userId },
					select: { isSuperuser: true },
				});
				if (!user?.isSuperuser) {
					throw new ForbiddenException("Only admins can configure custom API keys");
				}
			}

		let apiKeyToStore = "";
		let apiKeyPreview = "";

		if (createDto.is_platform_key) {
			apiKeyToStore = "";
			apiKeyPreview = "platform-key";
		} else if (createDto.user_provider_key_id) {
			const decrypted = await this.apiKeysService.getDecryptedKey(
				createDto.user_provider_key_id,
				userId,
			);
			apiKeyToStore = encrypt(decrypted);
			apiKeyPreview = maskApiKey(decrypted);
		} else if (createDto.api_key) {
			apiKeyToStore = encrypt(createDto.api_key);
			apiKeyPreview = maskApiKey(createDto.api_key);
		}

			const llmConfig = await this.prisma.lLMConfig.create({
				data: {
					name: createDto.name,
					provider: createDto.provider,
					customProvider: createDto.custom_provider || null,
					modelName: createDto.model_name,
					apiKey: apiKeyToStore,
					apiKeyPreview,
					apiBase: createDto.api_base || null,
					isPlatformKey: createDto.is_platform_key ?? false,
					litellmParams: createDto.litellm_params || {},
					searchSpaceId: createDto.search_space_id,
					userProviderKeyId: createDto.user_provider_key_id || null,
				},
			});

			return this.toDto(llmConfig);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to create LLM configuration: ${error.message}`,
			);
		}
	}

	async findAll(
		searchSpaceId: number,
		userId: string,
		skip: number = 0,
		limit: number = 200,
	): Promise<LLMConfigDto[]> {
		try {
			await this.ensureSearchSpaceAccess(searchSpaceId, userId);

			const llmConfigs = await this.prisma.lLMConfig.findMany({
				where: { searchSpaceId },
				skip,
				take: limit,
			});

			return llmConfigs.map((config) => this.toDto(config));
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch LLM configurations: ${error.message}`,
			);
		}
	}

	async findOne(id: number, userId: string): Promise<LLMConfigDto> {
		try {
			const llmConfig = await this.prisma.lLMConfig.findUnique({
				where: { id },
			});

			if (!llmConfig) {
				throw new NotFoundException("LLM configuration not found");
			}

			await this.ensureSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			return this.toDto(llmConfig);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch LLM configuration: ${error.message}`,
			);
		}
	}

	async update(
		id: number,
		updateDto: UpdateLLMConfigDto,
		userId: string,
	): Promise<LLMConfigDto> {
		try {
			const llmConfig = await this.prisma.lLMConfig.findUnique({
				where: { id },
			});

			if (!llmConfig) {
				throw new NotFoundException("LLM configuration not found");
			}

			await this.ensureSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			// Admin check: only admins can configure custom API keys
			if (updateDto.api_key || updateDto.user_provider_key_id) {
				const user = await this.prisma.user.findUnique({
					where: { id: userId },
					select: { isSuperuser: true },
				});
				if (!user?.isSuperuser) {
					throw new ForbiddenException("Only admins can configure custom API keys");
				}
			}

			const selectiveData: {
				name?: string;
				provider?: LiteLLMProvider;
				customProvider?: string | null;
				modelName?: string;
				apiKey?: string;
				apiKeyPreview?: string;
				apiBase?: string | null;
				isPlatformKey?: boolean;
				litellmParams?: Record<string, unknown> | null;
				userProviderKeyId?: string | null;
			} = {};

			if (updateDto.name !== undefined) selectiveData.name = updateDto.name;
			if (updateDto.provider !== undefined) selectiveData.provider = updateDto.provider;
			if (updateDto.custom_provider !== undefined) selectiveData.customProvider = updateDto.custom_provider || null;
			if (updateDto.model_name !== undefined) selectiveData.modelName = updateDto.model_name;
			if (updateDto.api_base !== undefined) selectiveData.apiBase = updateDto.api_base || null;
			if (updateDto.is_platform_key !== undefined) selectiveData.isPlatformKey = updateDto.is_platform_key;
			if (updateDto.litellm_params !== undefined) selectiveData.litellmParams = updateDto.litellm_params;

			if (updateDto.user_provider_key_id) {
				const decrypted = await this.apiKeysService.getDecryptedKey(
					updateDto.user_provider_key_id,
					userId,
				);
				selectiveData.apiKey = encrypt(decrypted);
				selectiveData.apiKeyPreview = maskApiKey(decrypted);
				selectiveData.userProviderKeyId = updateDto.user_provider_key_id;
			} else if (updateDto.api_key) {
				selectiveData.apiKey = encrypt(updateDto.api_key);
				selectiveData.apiKeyPreview = maskApiKey(updateDto.api_key);
				selectiveData.userProviderKeyId = null;
			}

			this.apiKeysService.invalidateConfigCache(id);

			const updated = await this.prisma.lLMConfig.update({
				where: { id },
				data: selectiveData,
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update LLM configuration: ${error.message}`,
			);
		}
	}

	async remove(id: number, userId: string): Promise<{ message: string }> {
		try {
			const llmConfig = await this.prisma.lLMConfig.findUnique({
				where: { id },
			});

			if (!llmConfig) {
				throw new NotFoundException("LLM configuration not found");
			}

			await this.ensureSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			this.apiKeysService.invalidateConfigCache(id);

			await this.prisma.lLMConfig.delete({
				where: { id },
			});

			return { message: "LLM configuration deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete LLM configuration: ${error.message}`,
			);
		}
	}

	async getUserLLMPreferences(
		searchSpaceId: number,
		userId: string,
	): Promise<LLMPreferencesDto> {
		try {
			await this.ensureSearchSpaceAccess(searchSpaceId, userId);

			let preference = await this.prisma.userSearchSpacePreference.findFirst({
				where: { userId, searchSpaceId },
				include: {
					longContextLlm: true,
					fastLlm: true,
					strategicLlm: true,
				},
			});

			if (!preference) {
				preference = await this.prisma.userSearchSpacePreference.create({
					data: { userId, searchSpaceId },
					include: {
						longContextLlm: true,
						fastLlm: true,
						strategicLlm: true,
					},
				});
			}

			return {
				long_context_llm_id: preference.longContextLlmId,
				fast_llm_id: preference.fastLlmId,
				strategic_llm_id: preference.strategicLlmId,
				long_context_llm: preference.longContextLlm
					? this.toDto(preference.longContextLlm)
					: undefined,
				fast_llm: preference.fastLlm
					? this.toDto(preference.fastLlm)
					: undefined,
				strategic_llm: preference.strategicLlm
					? this.toDto(preference.strategicLlm)
					: undefined,
			};
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to fetch LLM preferences: ${error.message}`,
			);
		}
	}

	async updateUserLLMPreferences(
		searchSpaceId: number,
		preferencesDto: LLMPreferencesUpdateDto,
		userId: string,
	): Promise<LLMPreferencesDto> {
		try {
			await this.ensureSearchSpaceAccess(searchSpaceId, userId);

			let preference = await this.prisma.userSearchSpacePreference.findFirst({
				where: { userId, searchSpaceId },
			});

			if (!preference) {
				preference = await this.prisma.userSearchSpacePreference.create({
					data: { userId, searchSpaceId },
				});
			}

			for (const [, llmConfigId] of Object.entries(preferencesDto)) {
				if (llmConfigId !== null && llmConfigId !== undefined) {
					const llmConfig = await this.prisma.lLMConfig.findFirst({
						where: { id: llmConfigId, searchSpaceId },
					});

					if (!llmConfig) {
						throw new NotFoundException(
							`LLM configuration ${llmConfigId} not found in this search space`,
						);
					}
				}
			}

			const updated = await this.prisma.userSearchSpacePreference.update({
				where: { id: preference.id },
				data: {
					longContextLlmId: preferencesDto.long_context_llm_id,
					fastLlmId: preferencesDto.fast_llm_id,
					strategicLlmId: preferencesDto.strategic_llm_id,
				},
				include: {
					longContextLlm: true,
					fastLlm: true,
					strategicLlm: true,
				},
			});

			return {
				long_context_llm_id: updated.longContextLlmId,
				fast_llm_id: updated.fastLlmId,
				strategic_llm_id: updated.strategicLlmId,
				long_context_llm: updated.longContextLlm
					? this.toDto(updated.longContextLlm)
					: undefined,
				fast_llm: updated.fastLlm ? this.toDto(updated.fastLlm) : undefined,
				strategic_llm: updated.strategicLlm
					? this.toDto(updated.strategicLlm)
					: undefined,
			};
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update LLM preferences: ${error.message}`,
			);
		}
	}

	private toDto(llmConfig: {
		id: number;
		name: string;
		provider: LiteLLMProvider;
		customProvider: string | null;
		modelName: string;
		apiKey: string;
		apiKeyPreview: string | null;
		apiBase: string | null;
		isPlatformKey: boolean;
		litellmParams: Record<string, unknown> | null;
		searchSpaceId: number;
		userProviderKeyId: string | null;
		createdAt: Date;
	}): LLMConfigDto {
		return {
			id: llmConfig.id,
			name: llmConfig.name,
			provider: llmConfig.provider,
			custom_provider: llmConfig.customProvider,
			model_name: llmConfig.modelName,
			api_key_preview: llmConfig.apiKeyPreview || '********',
			api_base: llmConfig.apiBase,
			is_platform_key: llmConfig.isPlatformKey,
			litellm_params: llmConfig.litellmParams,
			search_space_id: llmConfig.searchSpaceId,
			user_provider_key_id: llmConfig.userProviderKeyId,
			created_at: llmConfig.createdAt,
		};
	}
}
