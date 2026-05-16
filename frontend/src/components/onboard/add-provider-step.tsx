"use client";

import { AlertCircle, Bot, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { LLMConfigForm } from "@/components/llm-config-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type CreateLLMConfig, useLLMConfigs } from "@/hooks/use-llm-configs";

interface AddProviderStepProps {
	searchSpaceId: number;
	onConfigCreated?: () => void;
	onConfigDeleted?: () => void;
}

export function AddProviderStep({
	searchSpaceId,
	onConfigCreated,
	onConfigDeleted,
}: AddProviderStepProps) {
	const { llmConfigs, createLLMConfig, deleteLLMConfig } = useLLMConfigs(searchSpaceId);
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (formData: CreateLLMConfig) => {
		if (!formData.name || !formData.provider || !formData.model_name || (!formData.api_key && !formData.user_provider_key_id)) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		const result = await createLLMConfig(formData);
		setIsSubmitting(false);

		if (result) {
			setIsAddingNew(false);
			onConfigCreated?.();
		}
	};

	return (
		<div className="space-y-6">
			<Alert>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>Add your first LLM provider to get started. You can add multiple providers and assign them different roles.</AlertDescription>
			</Alert>

			{llmConfigs.length > 0 && (
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Your LLM Configurations</h3>
					<div className="grid gap-4">
						{llmConfigs.map((config) => (
							<motion.div
								key={config.id}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
							>
								<Card className="border-l-4 border-l-primary">
									<CardContent className="pt-4">
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-2">
													<Bot className="w-4 h-4" />
													<h4 className="font-medium">{config.name}</h4>
													<Badge variant="secondary">{config.provider}</Badge>
												</div>
												<p className="text-sm text-muted-foreground">
													Model: {config.model_name}
													{config.language && ` • Language: ${config.language}`}
													{config.api_base && ` • Base: ${config.api_base}`}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={async () => {
													const success = await deleteLLMConfig(config.id);
													if (success) {
														onConfigDeleted?.();
													}
												}}
												className="text-destructive hover:text-destructive"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</div>
			)}

			{!isAddingNew ? (
				<Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Plus className="w-12 h-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">Add LLM Provider</h3>
						<p className="text-muted-foreground text-center mb-4">Configure your first LLM provider to get started</p>
						<Button onClick={() => setIsAddingNew(true)}>
							<Plus className="w-4 h-4 mr-2" />
							Add Provider
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Add New LLM Provider</CardTitle>
						<CardDescription>Configure a new LLM provider</CardDescription>
					</CardHeader>
					<CardContent>
						<LLMConfigForm
							searchSpaceId={searchSpaceId}
							onSubmit={handleSubmit}
							onCancel={() => setIsAddingNew(false)}
							isSubmitting={isSubmitting}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
