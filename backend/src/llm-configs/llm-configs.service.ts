import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import {
	CreateLLMConfigDto,
	LLMConfigDto,
	LLMPreferencesDto,
	LLMPreferencesUpdateDto,
	UpdateLLMConfigDto,
} from "./dtos/llm-config.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LLMConfigsService {
	constructor(private prisma: PrismaService) {}

	async checkSearchSpaceAccess(
		searchSpaceId: number,
		userId: string,
	): Promise<void> {
		const searchSpace = await this.prisma.searchSpace.findFirst({
			where: { id: searchSpaceId, userId },
		});

		if (!searchSpace) {
			throw new NotFoundException(
				"Search space not found or you do not have permission to access it",
			);
		}
	}

	async create(
		createDto: CreateLLMConfigDto,
		userId: string,
	): Promise<LLMConfigDto> {
		try {
			await this.checkSearchSpaceAccess(createDto.search_space_id, userId);

			const llmConfig = await this.prisma.lLMConfig.create({
				data: {
					name: createDto.name,
					provider: createDto.provider,
					customProvider: createDto.custom_provider,
					modelName: createDto.model_name,
					apiKey: createDto.api_key,
					apiBase: createDto.api_base,
					language: createDto.language || "English",
					litellmParams: createDto.litellm_params || {},
					searchSpaceId: createDto.search_space_id,
				},
			});

			return this.toDto(llmConfig);
		} catch (error) {
			if (error instanceof NotFoundException) {
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
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			const llmConfigs = await this.prisma.lLMConfig.findMany({
				where: { searchSpaceId },
				skip,
				take: limit,
			});

			return llmConfigs.map((config) => this.toDto(config));
		} catch (error) {
			if (error instanceof NotFoundException) {
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

			await this.checkSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			return this.toDto(llmConfig);
		} catch (error) {
			if (error instanceof NotFoundException) {
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

			await this.checkSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			const updated = await this.prisma.lLMConfig.update({
				where: { id },
				data: {
					name: updateDto.name,
					provider: updateDto.provider,
					customProvider: updateDto.custom_provider,
					modelName: updateDto.model_name,
					apiKey: updateDto.api_key,
					apiBase: updateDto.api_base,
					language: updateDto.language,
					litellmParams: updateDto.litellm_params,
				},
			});

			return this.toDto(updated);
		} catch (error) {
			if (error instanceof NotFoundException) {
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

			await this.checkSearchSpaceAccess(llmConfig.searchSpaceId, userId);

			await this.prisma.lLMConfig.delete({
				where: { id },
			});

			return { message: "LLM configuration deleted successfully" };
		} catch (error) {
			if (error instanceof NotFoundException) {
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
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

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
			if (error instanceof NotFoundException) {
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
			await this.checkSearchSpaceAccess(searchSpaceId, userId);

			let preference = await this.prisma.userSearchSpacePreference.findFirst({
				where: { userId, searchSpaceId },
			});

			if (!preference) {
				preference = await this.prisma.userSearchSpacePreference.create({
					data: { userId, searchSpaceId },
				});
			}

			const languages = new Set<string>();

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

					if (llmConfig.language) {
						languages.add(llmConfig.language);
					}
				}
			}

			if (languages.size > 1) {
				throw new BadRequestException(
					"All selected LLM configurations must have the same language setting",
				);
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
				error instanceof BadRequestException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update LLM preferences: ${error.message}`,
			);
		}
	}

	private toDto(llmConfig: any): LLMConfigDto {
		return {
			id: llmConfig.id,
			name: llmConfig.name,
			provider: llmConfig.provider,
			custom_provider: llmConfig.customProvider,
			model_name: llmConfig.modelName,
			api_key: llmConfig.apiKey,
			api_base: llmConfig.apiBase,
			language: llmConfig.language,
			litellm_params: llmConfig.litellmParams,
			search_space_id: llmConfig.searchSpaceId,
			created_at: llmConfig.createdAt,
		};
	}
}
