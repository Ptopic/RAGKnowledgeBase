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
import { useState } from "react";
import { toast } from "sonner";
import useCreateApiKey from "@/api/api-keys/hooks/useCreateApiKey";
import useDeleteApiKey from "@/api/api-keys/hooks/useDeleteApiKey";
import useGetApiKeys from "@/api/api-keys/hooks/useGetApiKeys";
import useUpdateApiKey from "@/api/api-keys/hooks/useUpdateApiKey";
import type { CreateApiKey, UpdateApiKey, UserProviderApiKey } from "@/api/api-keys/types";
import { ApiKeyForm } from "@/components/api-key-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { LLM_PROVIDERS } from "@/contracts/enums/llm-providers";

export function ApiKeysManager() {
	const { data: apiKeys = [], isLoading: loading, error, refetch } = useGetApiKeys();
	const createMutation = useCreateApiKey();
	const updateMutation = useUpdateApiKey();
	const deleteMutation = useDeleteApiKey();

	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editingKey, setEditingKey] = useState<UserProviderApiKey | null>(null);
	const [deletingKey, setDeletingKey] = useState<UserProviderApiKey | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const openAddDialog = () => {
		setIsAddingNew(true);
	};

	const openEditDialog = (key: UserProviderApiKey) => {
		setEditingKey(key);
	};

	const closeDialogs = () => {
		setIsAddingNew(false);
		setEditingKey(null);
	};

	const handleAddSubmit = async (data: CreateApiKey) => {
		if (!data.provider || !data.name || !data.api_key) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			await createMutation.mutateAsync(data);
			toast.success("API key saved successfully");
			closeDialogs();
			refetch();
		} catch {
			toast.error("Failed to save API key");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditSubmit = async (data: CreateApiKey) => {
		if (!data.name) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			const updateData: UpdateApiKey = { name: data.name };
			if (data.api_key) {
				updateData.api_key = data.api_key;
			}
			if (!editingKey) return;
			await updateMutation.mutateAsync({ id: editingKey.id, data: updateData });
			toast.success("API key updated successfully");
			closeDialogs();
			refetch();
		} catch {
			toast.error("Failed to update API key");
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
						<Button onClick={openAddDialog} className="flex items-center gap-2">
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
								<Button onClick={openAddDialog} size="lg">
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
																onClick={() => openEditDialog(apiKey)}
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
					if (!open) closeDialogs();
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

					<ApiKeyForm
						onSubmit={handleAddSubmit}
						onCancel={closeDialogs}
						isSubmitting={isSubmitting}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Key Dialog */}
			<Dialog
				open={!!editingKey}
				onOpenChange={(open) => {
					if (!open) closeDialogs();
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

					<ApiKeyForm
						key={editingKey?.id ?? "new"}
						editingKey={editingKey}
						onSubmit={handleEditSubmit}
						onCancel={closeDialogs}
						isSubmitting={isSubmitting}
					/>
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
