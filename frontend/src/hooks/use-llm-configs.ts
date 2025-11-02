"use client";
import useCreateLLMConfig from "@/api/llm-configs/hooks/useCreateLLMConfig";
import useDeleteLLMConfig from "@/api/llm-configs/hooks/useDeleteLLMConfig";
import useGetLLMConfigs from "@/api/llm-configs/hooks/useGetLLMConfigs";
import useGetLLMPreferences from "@/api/llm-configs/hooks/useGetLLMPreferences";
import useUpdateLLMConfig from "@/api/llm-configs/hooks/useUpdateLLMConfig";
import useUpdateLLMPreferences from "@/api/llm-configs/hooks/useUpdateLLMPreferences";

// Re-export types for backward compatibility
export type {
	CreateLLMConfig,
	LLMConfig,
	LLMPreferences,
	UpdateLLMConfig,
} from "@/api/llm-configs/types";

export function useLLMConfigs(searchSpaceId: number | null) {
	const params = searchSpaceId ? { search_space_id: searchSpaceId } : null;

	const { data: llmConfigs = [], isLoading: loading, error: queryError, refetch } = useGetLLMConfigs(params);
	const createMutation = useCreateLLMConfig();
	const updateMutation = useUpdateLLMConfig();
	const deleteMutation = useDeleteLLMConfig();

	const error = queryError?.message || null;

	const createLLMConfig = async (config: import("@/api/llm-configs/types").CreateLLMConfig) => {
		try {
			const result = await createMutation.mutateAsync(config);
			return result;
		} catch {
			return null;
		}
	};

	const updateLLMConfig = async (
		id: number,
		config: import("@/api/llm-configs/types").UpdateLLMConfig
	) => {
		try {
			const result = await updateMutation.mutateAsync({ id, data: config });
			return result;
		} catch {
			return null;
		}
	};

	const deleteLLMConfig = async (id: number): Promise<boolean> => {
		try {
			await deleteMutation.mutateAsync(id);
			return true;
		} catch {
			return false;
		}
	};

	const refreshConfigs = () => {
		refetch();
	};

	return {
		llmConfigs,
		loading,
		error,
		createLLMConfig,
		updateLLMConfig,
		deleteLLMConfig,
		refreshConfigs,
	};
}

export function useLLMPreferences(searchSpaceId: number | null) {
	const params = searchSpaceId ? { search_space_id: searchSpaceId } : null;

	const { data: preferences = {}, isLoading: loading, error: queryError, refetch } = useGetLLMPreferences(params);
	const updateMutation = useUpdateLLMPreferences();

	const error = queryError?.message || null;

	const updatePreferences = async (
		newPreferences: Partial<import("@/api/llm-configs/types").LLMPreferences>
	): Promise<boolean> => {
		if (!searchSpaceId) {
			return false;
		}

		try {
			await updateMutation.mutateAsync({
				search_space_id: searchSpaceId,
				preferences: newPreferences,
			});
			return true;
		} catch {
			return false;
		}
	};

	const refreshPreferences = () => {
		refetch();
	};

	const isOnboardingComplete = (): boolean => {
		return !!(
			preferences.long_context_llm_id &&
			preferences.fast_llm_id &&
			preferences.strategic_llm_id
		);
	};

	return {
		preferences,
		loading,
		error,
		updatePreferences,
		refreshPreferences,
		isOnboardingComplete,
	};
}
