"use client";

import { useEffect, useState } from "react";
import type { CreateApiKey, UserProviderApiKey } from "@/api/api-keys/types";
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
import { LLM_PROVIDERS } from "@/contracts/enums/llm-providers";

interface ApiKeyFormProps {
	editingKey?: UserProviderApiKey | null;
	onSubmit: (data: CreateApiKey) => Promise<unknown>;
	onCancel: () => void;
	isSubmitting: boolean;
}

const DEFAULT_FORM_DATA: CreateApiKey = {
	provider: "",
	api_key: "",
	name: "",
};

export function ApiKeyForm({
	editingKey,
	onSubmit,
	onCancel,
	isSubmitting,
}: ApiKeyFormProps) {
	const [formData, setFormData] = useState<CreateApiKey>(() => {
		if (editingKey) {
			return {
				provider: editingKey.provider,
				api_key: "",
				name: editingKey.name,
			};
		}
		return { ...DEFAULT_FORM_DATA };
	});

	useEffect(() => {
		if (editingKey) {
			setFormData({
				provider: editingKey.provider,
				api_key: "",
				name: editingKey.name,
			});
		} else {
			setFormData({ ...DEFAULT_FORM_DATA });
		}
	}, [editingKey]);

	const handleInputChange = (field: keyof CreateApiKey, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(formData);
	};

	const isEditing = !!editingKey;

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor={isEditing ? "edit-provider" : "provider"}>
					Provider {isEditing ? "" : "*"}
				</Label>
				{isEditing ? (
					<>
						<Input
							id="edit-provider"
							value={
								LLM_PROVIDERS.find((p) => p.value === formData.provider)?.label ||
								formData.provider
							}
							disabled
							className="bg-muted"
						/>
						<p className="text-xs text-muted-foreground">
							Provider cannot be changed after creation
						</p>
					</>
				) : (
					<Select
						value={formData.provider}
						onValueChange={(value) => handleInputChange("provider", value)}
					>
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
									{provider.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor={isEditing ? "edit-name" : "name"}>Key Name *</Label>
				<Input
					id={isEditing ? "edit-name" : "name"}
					placeholder="e.g., My OpenAI Key"
					value={formData.name}
					onChange={(e) => handleInputChange("name", e.target.value)}
					required
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor={isEditing ? "edit-api_key" : "api_key"}>
					API Key {isEditing ? "" : "*"}
				</Label>
				<Input
					id={isEditing ? "edit-api_key" : "api_key"}
					type="password"
					placeholder={isEditing ? "Leave blank to keep current key" : "Your API key"}
					value={formData.api_key}
					onChange={(e) => handleInputChange("api_key", e.target.value)}
					required={!isEditing}
				/>
				{isEditing && (
					<p className="text-xs text-muted-foreground">
						Leave blank to keep the existing key unchanged
					</p>
				)}
			</div>

			<div className="flex gap-2 pt-4">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? isEditing
							? "Updating..."
							: "Saving..."
						: isEditing
							? "Update API Key"
							: "Save API Key"}
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
