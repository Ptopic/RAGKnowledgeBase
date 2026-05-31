"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import useGetApiKeys from "@/api/api-keys/hooks/useGetApiKeys";
import type { CreateLLMConfig, LLMConfig } from "@/api/llm-configs/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { LLM_PROVIDERS, OPENAI_MODELS } from "@/contracts/enums/llm-providers";
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

	const [useSavedKey, setUseSavedKey] = useState(
		!!editingConfig?.user_provider_key_id,
	);
	const [draftApiKey, setDraftApiKey] = useState(
		"",
	);

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
			setUseSavedKey(!!editingConfig.user_provider_key_id);
			setDraftApiKey("");
		} else {
			setFormData({
				...DEFAULT_FORM_DATA,
				search_space_id: searchSpaceId,
				is_platform_key: !isSuperuser,
			});
			setUseSavedKey(false);
			setDraftApiKey("");
		}
	}, [editingConfig, isSuperuser, searchSpaceId]);

	const { data: savedApiKeys = [] } = useGetApiKeys();

	type StringFormField = Exclude<keyof CreateLLMConfig, 'litellm_params' | 'search_space_id' | 'is_platform_key'>;

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
					<Label htmlFor="provider">Provider *</Label>
					<Select
						value={formData.provider}
						onValueChange={(value) => {
							handleInputChange("provider", value);
							if (value !== "OPENAI") {
								handleInputChange("api_base", "");
							}
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select a provider" />
						</SelectTrigger>
						<SelectContent>
							{LLM_PROVIDERS.map((provider) => (
								<SelectItem key={provider.value} value={provider.value}>
									<div className="space-y-1 py-1">
										<div className="font-medium">{provider.label}</div>
										<div className="text-xs text-muted-foreground">{provider.example}</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="model_name">Model *</Label>
					{formData.provider === "OPENAI" ? (
						<Select value={formData.model_name} onValueChange={(value) => handleInputChange("model_name", value)}>
							<SelectTrigger>
								<SelectValue placeholder="Select a model" />
							</SelectTrigger>
							<SelectContent>
								{OPENAI_MODELS.map((model) => (
									<SelectItem key={model.value} value={model.value}>
										<div className="space-y-1 py-1">
											<div className="font-medium">{model.label}</div>
											<div className="text-xs text-muted-foreground">{model.costEstimate}</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<Input
							id="model_name"
							placeholder="Model name"
							value={formData.model_name}
							onChange={(e) => handleInputChange("model_name", e.target.value)}
						/>
					)}
				</div>
			</div>

			{isSuperuser ? (
				<>
					<div className="flex items-center justify-between rounded-lg border p-3">
						<div className="space-y-0.5">
							<Label className="text-sm font-medium">Use Saved Key</Label>
							<p className="text-xs text-muted-foreground">
								{useSavedKey
									? "Select a previously saved provider key"
									: "Enter an API key directly"}
							</p>
						</div>
						<Switch
							checked={useSavedKey}
							onCheckedChange={(checked) => {
								if (checked) {
									setDraftApiKey(formData.api_key || "");
								} else {
									setFormData((prev) => ({
										...prev,
										api_key: draftApiKey,
										user_provider_key_id: "",
									}));
								}
								setUseSavedKey(checked);
							}}
						/>
					</div>

					{useSavedKey ? (
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
												<Badge variant="secondary" className="text-xs">{key.provider}</Badge>
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
					) : (
						<div className="space-y-2">
							<Label htmlFor="api_key">API Key *</Label>
							<Input
								id="api_key"
								type="password"
								placeholder={editingConfig ? "Leave blank to keep current key" : "Your API key"}
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
					<p className="text-sm text-muted-foreground">Platform API key will be used (managed by admin)</p>
					<input type="hidden" name="is_platform_key" value="true" />
				</div>
			)}

			<div className="space-y-2">
				<Label htmlFor="api_base">
					API Base URL
					<span className="text-xs font-normal text-muted-foreground ml-2">
						(Auto-filled for OpenAI)
					</span>
				</Label>
				<Input
					id="api_base"
					placeholder="https://api.openai.com/v1"
					value={formData.api_base}
					onChange={(e) => handleInputChange("api_base", e.target.value)}
				/>
				{formData.api_base === "https://api.openai.com/v1" && (
					<p className="text-xs text-green-600 flex items-center gap-1">
						<CheckCircle className="h-3 w-3" />
						Using recommended API endpoint for OpenAI
					</p>
				)}
				{!formData.api_base && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle className="h-3 w-3" />
						<AlertDescription className="text-xs">
							API Base URL is recommended for OpenAI.{" "}
							<button
								type="button"
								className="underline font-medium"
								onClick={() => handleInputChange("api_base", "https://api.openai.com/v1")}
							>
								Click to auto-fill: https://api.openai.com/v1
							</button>
						</AlertDescription>
					</Alert>
				)}
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
