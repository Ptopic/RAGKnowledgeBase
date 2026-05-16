"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
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
import { LANGUAGES } from "@/contracts/enums/languages";
import { LLM_PROVIDERS } from "@/contracts/enums/llm-providers";
import InferenceParamsEditor from "./inference-params-editor";

interface LLMConfigFormProps {
	searchSpaceId: number;
	editingConfig?: LLMConfig | null;
	onSubmit: (data: CreateLLMConfig) => Promise<unknown>;
	onCancel: () => void;
	isSubmitting: boolean;
}

const DEFAULT_FORM_DATA: CreateLLMConfig = {
	name: "",
	provider: "",
	custom_provider: "",
	model_name: "",
	api_key: "",
	api_base: "",
	language: "English",
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
}: LLMConfigFormProps) {
	const [formData, setFormData] = useState<CreateLLMConfig>(() => {
		if (editingConfig) {
			return {
				name: editingConfig.name,
				provider: editingConfig.provider,
				custom_provider: editingConfig.custom_provider || "",
				model_name: editingConfig.model_name,
				api_key: editingConfig.api_key,
				api_base: editingConfig.api_base || "",
				language: editingConfig.language || "English",
				litellm_params: editingConfig.litellm_params || {},
				search_space_id: searchSpaceId,
				user_provider_key_id:
					(editingConfig as Record<string, unknown>).user_provider_key_id as string || "",
			};
		}
		return { ...DEFAULT_FORM_DATA, search_space_id: searchSpaceId };
	});

	const [useSavedKey, setUseSavedKey] = useState(
		!!editingConfig && !!(editingConfig as Record<string, unknown>).user_provider_key_id,
	);

	const { data: savedApiKeys = [] } = useGetApiKeys();

	const handleInputChange = (field: keyof CreateLLMConfig, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleProviderChange = (providerValue: string) => {
		const provider = LLM_PROVIDERS.find((p) => p.value === providerValue);
		setFormData((prev) => ({
			...prev,
			provider: providerValue,
			api_base: provider?.apiBase || prev.api_base,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(formData);
	};

	const selectedProvider = LLM_PROVIDERS.find((p) => p.value === formData.provider);

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
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="provider">Provider *</Label>
					<Select value={formData.provider} onValueChange={handleProviderChange}>
						<SelectTrigger>
							<SelectValue placeholder="Select a provider">
								{formData.provider && (
									<span className="font-medium">
										{LLM_PROVIDERS.find((p) => p.value === formData.provider)?.label}
									</span>
								)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{LLM_PROVIDERS.map((provider) => (
								<SelectItem key={provider.value} value={provider.value}>
									<div className="space-y-1 py-1">
										<div className="font-medium">{provider.label}</div>
										<div className="text-xs text-muted-foreground">
											{provider.description}
										</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{formData.provider === "CUSTOM" && (
				<div className="space-y-2">
					<Label htmlFor="custom_provider">Custom Provider Name *</Label>
					<Input
						id="custom_provider"
						placeholder="e.g., my-custom-provider"
						value={formData.custom_provider}
						onChange={(e) => handleInputChange("custom_provider", e.target.value)}
						required
					/>
				</div>
			)}

			<div className="space-y-2">
				<Label htmlFor="model_name">Model Name *</Label>
				<Input
					id="model_name"
					placeholder={selectedProvider?.example || "e.g., gpt-4"}
					value={formData.model_name}
					onChange={(e) => handleInputChange("model_name", e.target.value)}
					required
				/>
				{selectedProvider && (
					<p className="text-xs text-muted-foreground">
						Examples: {selectedProvider.example}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="language">Language (Optional)</Label>
				<Select
					value={formData.language || "English"}
					onValueChange={(value) => handleInputChange("language", value)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select language" />
					</SelectTrigger>
					<SelectContent>
						{LANGUAGES.map((language) => (
							<SelectItem key={language.value} value={language.value}>
								{language.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center justify-between rounded-lg border p-3">
				<div className="space-y-0.5">
					<Label className="text-sm font-medium">Use Saved Key</Label>
					<p className="text-xs text-muted-foreground">
						{useSavedKey
							? "Select a previously saved provider key"
							: "Enter an API key directly"}
					</p>
				</div>
				<Switch checked={useSavedKey} onCheckedChange={setUseSavedKey} />
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
						placeholder="Your API key"
						value={formData.api_key}
						onChange={(e) => handleInputChange("api_key", e.target.value)}
					/>
				</div>
			)}

			<div className="space-y-2">
				<Label htmlFor="api_base">
					API Base URL
					{selectedProvider?.apiBase && (
						<span className="text-xs font-normal text-muted-foreground ml-2">
							(Auto-filled for {selectedProvider.label})
						</span>
					)}
				</Label>
				<Input
					id="api_base"
					placeholder={selectedProvider?.apiBase || "e.g., https://api.openai.com/v1"}
					value={formData.api_base}
					onChange={(e) => handleInputChange("api_base", e.target.value)}
				/>
				{selectedProvider?.apiBase && formData.api_base === selectedProvider.apiBase && (
					<p className="text-xs text-green-600 flex items-center gap-1">
						<CheckCircle className="h-3 w-3" />
						Using recommended API endpoint for {selectedProvider.label}
					</p>
				)}
				{selectedProvider?.apiBase && !formData.api_base && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle className="h-3 w-3" />
						<AlertDescription className="text-xs">
							API Base URL is recommended for {selectedProvider.label}.{" "}
							<button
								type="button"
								className="underline font-medium"
								onClick={() => handleInputChange("api_base", selectedProvider.apiBase || "")}
							>
								Click to auto-fill: {selectedProvider.apiBase}
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
