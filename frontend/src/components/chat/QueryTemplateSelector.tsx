"use client";

import { FileText, Globe } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import useGetSearchSpaceQueryTemplates from "@/api/query-templates/hooks/useGetSearchSpaceQueryTemplates";
import type { QueryTemplate } from "@/api/query-templates/types";

interface QueryTemplateSelectorProps {
	onSelectTemplate: (content: string) => void;
}

export const QueryTemplateSelector = React.memo(
	({ onSelectTemplate }: QueryTemplateSelectorProps) => {
		const { search_space_id } = useParams();
		const searchSpaceId = Number(search_space_id);
		const [isOpen, setIsOpen] = useState(false);

		const { data: templates = [], isLoading } = useGetSearchSpaceQueryTemplates(
			searchSpaceId ? { search_space_id: searchSpaceId } : null,
			{ enabled: !!searchSpaceId && isOpen },
		);

		const handleSelect = useCallback(
			(template: QueryTemplate) => {
				onSelectTemplate(template.content);
				setIsOpen(false);
			},
			[onSelectTemplate],
		);

		const handleOpenChange = useCallback((open: boolean) => {
			setIsOpen(open);
		}, []);

		return (
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-9 gap-2 px-3 border-dashed hover:border-solid hover:bg-accent/50 transition-all"
					>
						<FileText className="h-4 w-4 text-muted-foreground" />
						<span className="text-xs font-medium">Templates</span>
					</Button>
				</DialogTrigger>

				<DialogContent className="sm:max-w-2xl">
					<div className="space-y-4">
						<div>
							<DialogTitle className="text-xl">Query Templates</DialogTitle>
							<DialogDescription className="mt-1.5">
								Select a template to populate the query input
							</DialogDescription>
						</div>

						{isLoading ? (
							<div className="flex justify-center py-8">
								<div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
							</div>
						) : templates.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="rounded-full bg-muted p-4 mb-4">
									<FileText className="h-8 w-8 text-muted-foreground" />
								</div>
								<h4 className="text-sm font-medium mb-1">No templates found</h4>
								<p className="text-xs text-muted-foreground max-w-xs">
									Create query templates in settings to quickly reuse common prompts.
								</p>
							</div>
						) : (
							<div className="grid gap-3 max-h-[60vh] overflow-y-auto">
								{templates.map((template) => (
									<button
										key={template.id}
										onClick={() => handleSelect(template)}
										type="button"
										className="group relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left hover:border-primary/50 hover:bg-accent/50"
									>
										<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
											{template.icon ? (
												<span className="text-lg">{template.icon}</span>
											) : (
												<FileText className="h-5 w-5 text-primary" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<p className="text-sm font-medium truncate">
													{template.title}
												</p>
												{template.is_global && (
													<Badge variant="outline" className="text-xs px-1.5 py-0.5 flex-shrink-0">
														<Globe className="h-3 w-3 mr-1" />
														Global
													</Badge>
												)}
											</div>
											{template.description && (
												<p className="text-xs text-muted-foreground mb-1 line-clamp-1">
													{template.description}
												</p>
											)}
											<p className="text-xs text-muted-foreground font-mono line-clamp-2">
												{template.content}
											</p>
										</div>
									</button>
								))}
							</div>
						)}

						{templates.length > 0 && (
							<DialogFooter>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setIsOpen(false)}
									className="text-xs"
								>
									Cancel
								</Button>
							</DialogFooter>
						)}
					</div>
				</DialogContent>
			</Dialog>
		);
	},
);

QueryTemplateSelector.displayName = "QueryTemplateSelector";
