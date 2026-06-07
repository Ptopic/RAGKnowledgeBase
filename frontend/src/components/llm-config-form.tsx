"use client";

import { useEffect, useState } from "react";
import useGetApiKeys from "@/api/api-keys/hooks/useGetApiKeys";
import type { CreateLLMConfig, LLMConfig } from "@/api/llm-configs/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getOpenAIModel,
	LLM_PROVIDERS,
	OPENAI_MODELS,
} from "@/contracts/enums/llm-providers";

// LLM_PROVIDERS is kept for type re-exports; provider selection in the
// form is hardcoded to OpenAI per the ZR-263 LLM config simplification.
void LLM_PROVIDERS;

import InferenceParamsEditor from "./inference-params-editor";

interface LLMConfigFormProps {
	searchSpaceId: number;
	editingConfig?: LLMConfig | null;
	onSubmit: (data: CreateLLMConfig) => Promise<unknown>;
	onCancel: () => void;
	isSubmitting: boolean;
	isSuperuser?: boolean;
}

const DEFAULT_FORM_DATA: CreateLLMConfig = {
	name: "",
	provider: "OPENAI",
	custom_provider: "",
	model_name: "",
	api_key: "",
	api_base: "",
	is_platform_key: false,
	litellm_params: {},
	search_space_id: 0,
	user_provider_key_id: "",
};

export function LLMConfigForm({
	searchSpaceId,
	editingConfig,
	onSubmit,
	onCancel,
	isSubmitting,
	isSuperuser = false,
}: LLMConfigFormProps) {
	const [formData, setFormData] = useState<CreateLLMConfig>(() => {
		if (editingConfig) {
			return {
				name: editingConfig.name,
				provider: editingConfig.provider,
				custom_provider: editingConfig.custom_provider || "",
				model_name: editingConfig.model_name,
				api_key: "",
				api_base: editingConfig.api_base || "",
				is_platform_key: editingConfig.is_platform_key || false,
				litellm_params: editingConfig.litellm_params || {},
				search_space_id: searchSpaceId,
				user_provider_key_id: editingConfig.user_provider_key_id || "",
			};
		}
		return { ...DEFAULT_FORM_DATA, search_space_id: searchSpaceId };
	});

	const [draftApiKey, setDraftApiKey] = useState("");

	type KeyMode = "platform" | "saved" | "custom";
	const [keyMode, setKeyMode] = useState<KeyMode>(() => {
		if (!isSuperuser) return "platform";
		if (editingConfig?.is_platform_key) return "platform";
		if (editingConfig?.user_provider_key_id) return "saved";
		return "custom";
	});

	const handleKeyModeChange = (mode: KeyMode) => {
		if (mode === "platform") {
			setFormData((prev) => ({
				...prev,
				is_platform_key: true,
				api_key: "",
				user_provider_key_id: "",
			}));
		} else if (mode === "saved") {
			setDraftApiKey(formData.api_key || "");
			setFormData((prev) => ({
				...prev,
				is_platform_key: false,
				api_key: "",
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				is_platform_key: false,
				user_provider_key_id: "",
				api_key: draftApiKey,
			}));
		}
		setKeyMode(mode);
	};

	useEffect(() => {
		if (editingConfig) {
			setFormData({
				name: editingConfig.name,
				provider: editingConfig.provider,
				custom_provider: editingConfig.custom_provider || "",
				model_name: editingConfig.model_name,
				api_key: "",
				api_base: editingConfig.api_base || "",
				is_platform_key: editingConfig.is_platform_key || false,
				litellm_params: editingConfig.litellm_params || {},
				search_space_id: searchSpaceId,
				user_provider_key_id: editingConfig.user_provider_key_id || "",
			});
			setDraftApiKey("");
			if (editingConfig.is_platform_key) {
				setKeyMode("platform");
			} else if (editingConfig.user_provider_key_id) {
				setKeyMode("saved");
			} else {
				setKeyMode("custom");
			}
		} else {
			setFormData({
				...DEFAULT_FORM_DATA,
				search_space_id: searchSpaceId,
				is_platform_key: !isSuperuser,
			});
			setDraftApiKey("");
			setKeyMode(isSuperuser ? "custom" : "platform");
		}
	}, [editingConfig, isSuperuser, searchSpaceId]);

	const { data: savedApiKeys = [] } = useGetApiKeys();

	type StringFormField = Exclude<
		keyof CreateLLMConfig,
		"litellm_params" | "search_space_id" | "is_platform_key"
	>;

	const handleInputChange = (field: StringFormField, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="name">Configuration Name *</Label>
					<Input
						id="name"
						placeholder="e.g., My OpenAI GPT-4"
						value={formData.name}
						onChange={(e) => handleInputChange("name", e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<Label>Provider</Label>
					{/* Provider is hardcoded to OpenAI per the LLM config
					    simplification in ZR-263; the field is shown for
					    context but not editable. */}
					<Input value="OpenAI" disabled readOnly />
				</div>

				<div className="space-y-2">
					<Label htmlFor="model_name">Model *</Label>
					<Select
						value={formData.model_name}
						onValueChange={(value) => handleInputChange("model_name", value)}
					>
						<SelectTrigger id="model_name">
							<SelectValue placeholder="Select a model" />
						</SelectTrigger>
						<SelectContent className="max-h-[420px]">
							{OPENAI_MODELS.map((model) => (
								<SelectItem
									key={model.value}
									value={model.value}
									textValue={model.label}
									className="py-1.5"
								>
									<div className="space-y-0.5">
										<div className="font-medium leading-tight">
											{model.label}
										</div>
										<div className="text-xs text-muted-foreground leading-tight">
											{model.costEstimate}
										</div>
										<div className="text-xs text-muted-foreground leading-tight">
											{model.creditEstimate} · {model.tokenEstimate}
										</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{isSuperuser ? (
				<>
					<div className="space-y-2">
						<Label>API Key Source</Label>
						<Select
							value={keyMode}
							onValueChange={(v) => handleKeyModeChange(v as KeyMode)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="platform">
									Platform Key (admin-managed)
								</SelectItem>
								<SelectItem value="custom">Custom API Key</SelectItem>
								<SelectItem value="saved">Saved Provider Key</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{keyMode === "platform" && (
						<p className="text-sm text-muted-foreground">
							Platform API key will be used. No key entry needed — managed by
							admin.
						</p>
					)}

					{keyMode === "saved" && (
						<div className="space-y-2">
							<Label htmlFor="saved_key">Saved API Key *</Label>
							<Select
								value={formData.user_provider_key_id || ""}
								onValueChange={(value) => {
									setFormData((prev) => ({
										...prev,
										user_provider_key_id: value,
										api_key: "",
									}));
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a saved key" />
								</SelectTrigger>
								<SelectContent>
									{savedApiKeys.map((key) => (
										<SelectItem key={key.id} value={key.id}>
											<div className="flex items-center gap-2">
												<Badge variant="secondary" className="text-xs">
													{key.provider}
												</Badge>
												<span>{key.name}</span>
											</div>
										</SelectItem>
									))}
									{savedApiKeys.length === 0 && (
										<div className="p-2 text-sm text-muted-foreground text-center">
											No saved keys. Add one in Settings &rarr; API Keys.
										</div>
									)}
								</SelectContent>
							</Select>
						</div>
					)}

					{keyMode === "custom" && (
						<div className="space-y-2">
							<Label htmlFor="api_key">API Key *</Label>
							<Input
								id="api_key"
								type="password"
								placeholder={
									editingConfig
										? "Leave blank to keep current key"
										: "Your API key"
								}
								value={formData.api_key}
								onChange={(e) => handleInputChange("api_key", e.target.value)}
								required={!editingConfig}
							/>
							{editingConfig?.api_key_preview && (
								<p className="text-xs text-muted-foreground">
									Current: {editingConfig.api_key_preview}
								</p>
							)}
						</div>
					)}
				</>
			) : (
				<div className="space-y-2">
					<Label>API Key</Label>
					<p className="text-sm text-muted-foreground">
						Platform API key will be used (managed by admin)
					</p>
					<input type="hidden" name="is_platform_key" value="true" />
				</div>
			)}

			<div className="space-y-2">
				<Label htmlFor="api_base">API Base URL</Label>
				<Input
					id="api_base"
					placeholder="https://api.openai.com/v1"
					value={formData.api_base}
					onChange={(e) => handleInputChange("api_base", e.target.value)}
				/>
			</div>

			<div className="pt-4">
				<InferenceParamsEditor
					params={formData.litellm_params || {}}
					setParams={(newParams) =>
						setFormData((prev) => ({ ...prev, litellm_params: newParams }))
					}
				/>
			</div>

			<div className="flex gap-2 pt-4">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? editingConfig
							? "Updating..."
							: "Adding..."
						: editingConfig
							? "Update Configuration"
							: "Add Configuration"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
