"use client";

import {
	AlertCircle,
	CheckCircle,
	Clock,
	Edit3,
	Key,
	Loader2,
	Plus,
	RefreshCw,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import useCreateApiKey from "@/api/api-keys/hooks/useCreateApiKey";
import useDeleteApiKey from "@/api/api-keys/hooks/useDeleteApiKey";
import useGetApiKeys from "@/api/api-keys/hooks/useGetApiKeys";
import useUpdateApiKey from "@/api/api-keys/hooks/useUpdateApiKey";
import type { CreateApiKey, UpdateApiKey, UserProviderApiKey } from "@/api/api-keys/types";

export function ApiKeysManager() {
	const { data: apiKeys = [], isLoading: loading, error, refetch } = useGetApiKeys();
	const createMutation = useCreateApiKey();
	const updateMutation = useUpdateApiKey();
	const deleteMutation = useDeleteApiKey();

	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editingKey, setEditingKey] = useState<UserProviderApiKey | null>(null);
	const [deletingKey, setDeletingKey] = useState<UserProviderApiKey | null>(null);

	const [formData, setFormData] = useState<CreateApiKey>({
		provider: "",
		api_key: "",
		name: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Reset form when dialogs open/close
	useEffect(() => {
		if (isAddingNew) {
			setFormData({ provider: "", api_key: "", name: "" });
		}
	}, [isAddingNew]);

	useEffect(() => {
		if (editingKey) {
			setFormData({
				provider: editingKey.provider,
				api_key: "",
				name: editingKey.name,
			});
		}
	}, [editingKey]);

	const handleInputChange = (field: keyof CreateApiKey, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.provider || !formData.name) {
			toast.error("Please fill in all required fields");
			return;
		}

		// For new keys, api_key is required; for edits, it's optional
		if (!editingKey && !formData.api_key) {
			toast.error("Please enter an API key");
			return;
		}

		setIsSubmitting(true);

		try {
			if (editingKey) {
				const updateData: UpdateApiKey = { name: formData.name };
				if (formData.api_key) {
					updateData.api_key = formData.api_key;
				}
				await updateMutation.mutateAsync({ id: editingKey.id, data: updateData });
				toast.success("API key updated successfully");
			} else {
				await createMutation.mutateAsync(formData);
				toast.success("API key saved successfully");
			}

			setFormData({ provider: "", api_key: "", name: "" });
			setIsAddingNew(false);
			setEditingKey(null);
			refetch();
		} catch {
			toast.error(editingKey ? "Failed to update API key" : "Failed to save API key");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deletingKey) return;

		try {
			await deleteMutation.mutateAsync(deletingKey.id);
			toast.success("API key deleted successfully");
			setDeletingKey(null);
			refetch();
		} catch {
			toast.error("Failed to delete API key");
		}
	};

	const getProviderInfo = (providerValue: string) => {
		return LLM_PROVIDERS.find((p) => p.value === providerValue);
	};

	const uniqueProviders = new Set(apiKeys.map((k) => k.provider)).size;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
				<div className="space-y-1">
					<div className="flex items-center space-x-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
							<Key className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<h2 className="text-2xl font-bold tracking-tight">Saved API Keys</h2>
							<p className="text-muted-foreground">
								Store your LLM provider API keys securely for reuse across configurations.
							</p>
						</div>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={loading}
						className="flex items-center gap-2"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Loading State */}
			{loading && (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Loading API keys...</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Stats Overview */}
			{!loading && !error && (
				<div className="grid gap-4 md:grid-cols-2">
					<Card className="border-l-4 border-l-amber-500">
						<CardContent className="p-6">
							<div className="flex items-center justify-between space-x-4">
								<div className="space-y-1">
									<p className="text-3xl font-bold tracking-tight">{apiKeys.length}</p>
									<p className="text-sm font-medium text-muted-foreground">Total Keys</p>
								</div>
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
									<Key className="h-6 w-6 text-amber-600" />
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border-l-4 border-l-green-500">
						<CardContent className="p-6">
							<div className="flex items-center justify-between space-x-4">
								<div className="space-y-1">
									<p className="text-3xl font-bold tracking-tight">{uniqueProviders}</p>
									<p className="text-sm font-medium text-muted-foreground">Unique Providers</p>
								</div>
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
									<CheckCircle className="h-6 w-6 text-green-600" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Key Management */}
			{!loading && !error && (
				<div className="space-y-6">
					<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<h3 className="text-xl font-semibold tracking-tight">Your API Keys</h3>
							<p className="text-sm text-muted-foreground">
								Manage your saved provider API keys
							</p>
						</div>
						<Button onClick={() => setIsAddingNew(true)} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Add API Key
						</Button>
					</div>

					{apiKeys.length === 0 ? (
						<Card className="border-dashed border-2 border-muted-foreground/25">
							<CardContent className="flex flex-col items-center justify-center py-16 text-center">
								<div className="rounded-full bg-muted p-4 mb-6">
									<Key className="h-10 w-10 text-muted-foreground" />
								</div>
								<div className="space-y-2 mb-6">
									<h3 className="text-xl font-semibold">No API Keys Saved</h3>
									<p className="text-muted-foreground max-w-sm">
										Save your provider API keys here for easy reuse across model
										configurations.
									</p>
								</div>
								<Button onClick={() => setIsAddingNew(true)} size="lg">
									<Plus className="h-4 w-4 mr-2" />
									Add First API Key
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-4">
							<AnimatePresence>
								{apiKeys.map((apiKey) => {
									const providerInfo = getProviderInfo(apiKey.provider);
									return (
										<motion.div
											key={apiKey.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											transition={{ duration: 0.2 }}
										>
											<Card className="group border-l-4 border-l-amber-500/50 hover:border-l-amber-500 hover:shadow-md transition-all duration-200">
												<CardContent className="p-6">
													<div className="flex items-start justify-between">
														<div className="flex-1 space-y-4">
															{/* Header */}
															<div className="flex items-start gap-4">
																<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
																	<Key className="h-6 w-6 text-amber-600" />
																</div>
																<div className="flex-1 space-y-2">
																	<div className="flex items-center gap-3">
																		<h4 className="text-lg font-semibold tracking-tight">
																			{apiKey.name}
																		</h4>
																		<Badge variant="secondary" className="text-xs font-medium">
																			{providerInfo?.label || apiKey.provider}
																		</Badge>
																	</div>
																	<div className="flex items-center gap-2 text-sm text-muted-foreground">
																		<ShieldCheck className="h-4 w-4" />
																		<span>Key stored securely</span>
																	</div>
																</div>
															</div>

															{/* Provider Description */}
															{providerInfo && (
																<p className="text-sm text-muted-foreground">
																	{providerInfo.description}
																</p>
															)}

															{/* Metadata */}
															<div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
																<div className="flex items-center gap-2 text-xs text-muted-foreground">
																	<Clock className="h-3 w-3" />
																	<span>
																		Created {new Date(apiKey.created_at).toLocaleDateString()}
																	</span>
																</div>
															</div>
														</div>

														{/* Actions */}
														<div className="flex flex-col gap-2 ml-6">
															<Button
																variant="outline"
																size="sm"
																onClick={() => setEditingKey(apiKey)}
																className="h-8 w-8 p-0"
															>
																<Edit3 className="h-4 w-4" />
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() => setDeletingKey(apiKey)}
																className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</div>
												</CardContent>
											</Card>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					)}
				</div>
			)}

			{/* Add New Key Dialog */}
			<Dialog
				open={isAddingNew}
				onOpenChange={(open) => {
					if (!open) {
						setIsAddingNew(false);
						setFormData({ provider: "", api_key: "", name: "" });
					}
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Plus className="w-5 h-5" />
							Add New API Key
						</DialogTitle>
						<DialogDescription>
							Save a provider API key for reuse across configurations
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="provider">Provider *</Label>
							<Select value={formData.provider} onValueChange={(value) => handleInputChange("provider", value)}>
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

						<div className="space-y-2">
							<Label htmlFor="name">Key Name *</Label>
							<Input
								id="name"
								placeholder="e.g., My OpenAI Key"
								value={formData.name}
								onChange={(e) => handleInputChange("name", e.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="api_key">API Key *</Label>
							<Input
								id="api_key"
								type="password"
								placeholder="Your API key"
								value={formData.api_key}
								onChange={(e) => handleInputChange("api_key", e.target.value)}
								required
							/>
						</div>

						<div className="flex gap-2 pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Saving..." : "Save API Key"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsAddingNew(false);
									setFormData({ provider: "", api_key: "", name: "" });
								}}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit Key Dialog */}
			<Dialog
				open={!!editingKey}
				onOpenChange={(open) => {
					if (!open) {
						setEditingKey(null);
						setFormData({ provider: "", api_key: "", name: "" });
					}
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Edit3 className="w-5 h-5" />
							Edit API Key
						</DialogTitle>
						<DialogDescription>
							Update your saved API key details
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="edit-provider">Provider</Label>
							<Input
								id="edit-provider"
								value={LLM_PROVIDERS.find((p) => p.value === formData.provider)?.label || formData.provider}
								disabled
								className="bg-muted"
							/>
							<p className="text-xs text-muted-foreground">
								Provider cannot be changed after creation
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-name">Key Name *</Label>
							<Input
								id="edit-name"
								placeholder="e.g., My OpenAI Key"
								value={formData.name}
								onChange={(e) => handleInputChange("name", e.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-api_key">API Key</Label>
							<Input
								id="edit-api_key"
								type="password"
								placeholder="Leave blank to keep current key"
								value={formData.api_key}
								onChange={(e) => handleInputChange("api_key", e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Leave blank to keep the existing key unchanged
							</p>
						</div>

						<div className="flex gap-2 pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Updating..." : "Update API Key"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setEditingKey(null);
									setFormData({ provider: "", api_key: "", name: "" });
								}}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!deletingKey}
				onOpenChange={(open) => {
					if (!open) setDeletingKey(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete API Key</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete the API key &quot;{deletingKey?.name}&quot; for{" "}
							{LLM_PROVIDERS.find((p) => p.value === deletingKey?.provider)?.label || deletingKey?.provider}?
							This action cannot be undone. Model configurations using this key will need to be
							updated.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
