"use client";

import {
	AlertCircle,
	Clock,
	Edit3,
	Globe,
	Loader2,
	Plus,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import useCreateSearchSpaceQueryTemplate from "@/api/query-templates/hooks/useCreateSearchSpaceQueryTemplate";
import useDeleteSearchSpaceQueryTemplate from "@/api/query-templates/hooks/useDeleteSearchSpaceQueryTemplate";
import useGetSearchSpaceQueryTemplates from "@/api/query-templates/hooks/useGetSearchSpaceQueryTemplates";
import type { CreateQueryTemplateRequest, QueryTemplate } from "@/api/query-templates/types";

interface QueryTemplateManagerProps {
	searchSpaceId: number;
}

export function QueryTemplateManager({ searchSpaceId }: QueryTemplateManagerProps) {
	const { data: templates = [], isLoading, error, refetch } = useGetSearchSpaceQueryTemplates({
		search_space_id: searchSpaceId,
	});
	const createMutation = useCreateSearchSpaceQueryTemplate();
	const deleteMutation = useDeleteSearchSpaceQueryTemplate();

	const [isAddingNew, setIsAddingNew] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState<QueryTemplate | null>(null);
	const [formData, setFormData] = useState<CreateQueryTemplateRequest>({
		title: "",
		description: "",
		content: "",
		icon: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const globalTemplates = templates.filter((t) => t.is_global);
	const spaceTemplates = templates.filter((t) => !t.is_global);

	const handleInputChange = (field: keyof CreateQueryTemplateRequest, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title || !formData.content) {
			toast.error("Title and content are required");
			return;
		}

		setIsSubmitting(true);

		await createMutation.mutateAsync({
			searchSpaceId,
			data: {
				...formData,
				is_global: false,
				search_space_id: searchSpaceId,
			},
		});

		setIsSubmitting(false);
		setFormData({ title: "", description: "", content: "", icon: "" });
		setIsAddingNew(false);
		setEditingTemplate(null);
	};

	const handleDelete = async (id: number) => {
		if (confirm("Are you sure you want to delete this template?")) {
			await deleteMutation.mutateAsync({ searchSpaceId, id });
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
				<div className="space-y-1">
					<div className="flex items-center space-x-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
							<Edit3 className="h-5 w-5 text-violet-600" />
						</div>
						<div>
							<h2 className="text-2xl font-bold tracking-tight">Query Templates</h2>
							<p className="text-muted-foreground">
								Manage reusable query templates for this search space.
							</p>
						</div>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isLoading}
						className="flex items-center gap-2"
					>
						<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}

			{isLoading && (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Loading templates...</span>
						</div>
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && globalTemplates.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Globe className="h-4 w-4 text-muted-foreground" />
						<h3 className="text-lg font-semibold">Global Templates</h3>
						<Badge variant="secondary" className="text-xs">{globalTemplates.length}</Badge>
					</div>
					<div className="grid gap-3">
						<AnimatePresence>
							{globalTemplates.map((template) => (
								<motion.div
									key={template.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2 }}
								>
									<Card className="group border-l-4 border-l-blue-400 hover:shadow-md transition-all duration-200">
										<CardContent className="p-4">
											<div className="flex items-start justify-between">
												<div className="flex-1 space-y-1">
													<div className="flex items-center gap-2">
														{template.icon && <span className="text-lg">{template.icon}</span>}
														<h4 className="text-sm font-semibold">{template.title}</h4>
														<Badge variant="outline" className="text-xs">
															<Globe className="h-3 w-3 mr-1" />
															Global
														</Badge>
													</div>
													{template.description && (
														<p className="text-xs text-muted-foreground">{template.description}</p>
													)}
													<p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">
														{template.content}
													</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
														<Clock className="h-3 w-3" />
														<span>Created {new Date(template.created_at).toLocaleDateString()}</span>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>
			)}

			{!isLoading && !error && (
				<div className="space-y-4">
					<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<h3 className="text-lg font-semibold">Search Space Templates</h3>
							<p className="text-sm text-muted-foreground">
								Manage templates specific to this search space
							</p>
						</div>
						<Button onClick={() => setIsAddingNew(true)} className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Add Template
						</Button>
					</div>

					{spaceTemplates.length === 0 && globalTemplates.length === 0 ? (
						<Card className="border-dashed border-2 border-muted-foreground/25">
							<CardContent className="flex flex-col items-center justify-center py-16 text-center">
								<div className="rounded-full bg-muted p-4 mb-6">
									<Edit3 className="h-10 w-10 text-muted-foreground" />
								</div>
								<div className="space-y-2 mb-6">
									<h3 className="text-xl font-semibold">No Templates Yet</h3>
									<p className="text-muted-foreground max-w-sm">
										Create query templates to quickly reuse common prompts and questions.
									</p>
								</div>
								<Button onClick={() => setIsAddingNew(true)} size="lg">
									<Plus className="h-4 w-4 mr-2" />
									Add First Template
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-3">
							<AnimatePresence>
								{spaceTemplates.map((template) => (
									<motion.div
										key={template.id}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -10 }}
										transition={{ duration: 0.2 }}
									>
										<Card className="group border-l-4 border-l-primary/50 hover:border-l-primary hover:shadow-md transition-all duration-200">
											<CardContent className="p-4">
												<div className="flex items-start justify-between">
													<div className="flex-1 space-y-1">
														<div className="flex items-center gap-2">
															{template.icon && <span className="text-lg">{template.icon}</span>}
															<h4 className="text-sm font-semibold">{template.title}</h4>
														</div>
														{template.description && (
															<p className="text-xs text-muted-foreground">{template.description}</p>
														)}
														<p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">
															{template.content}
														</p>
														<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
															<Clock className="h-3 w-3" />
															<span>Created {new Date(template.created_at).toLocaleDateString()}</span>
														</div>
													</div>
													<div className="flex flex-col gap-2 ml-4">
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleDelete(template.id)}
															className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
					)}
				</div>
			)}

			<Dialog
				open={isAddingNew || !!editingTemplate}
				onOpenChange={(open) => {
					if (!open) {
						setIsAddingNew(false);
						setEditingTemplate(null);
						setFormData({ title: "", description: "", content: "", icon: "" });
					}
				}}
			>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Plus className="w-5 h-5" />
							Add Query Template
						</DialogTitle>
						<DialogDescription>
							Create a reusable query template for this search space
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="title">Title *</Label>
							<Input
								id="title"
								placeholder="e.g., Summarize Documents"
								value={formData.title}
								onChange={(e) => handleInputChange("title", e.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								placeholder="Brief description of this template"
								value={formData.description || ""}
								onChange={(e) => handleInputChange("description", e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="icon">Icon (emoji)</Label>
							<Input
								id="icon"
								placeholder="e.g., 📝"
								value={formData.icon || ""}
								onChange={(e) => handleInputChange("icon", e.target.value)}
								maxLength={10}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="content">Query Content *</Label>
							<Textarea
								id="content"
								placeholder="Enter the query template content..."
								value={formData.content}
								onChange={(e) => handleInputChange("content", e.target.value)}
								required
								rows={6}
								className="resize-none"
							/>
						</div>

						<div className="flex gap-2 pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Adding..." : "Add Template"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsAddingNew(false);
									setEditingTemplate(null);
									setFormData({ title: "", description: "", content: "", icon: "" });
								}}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
