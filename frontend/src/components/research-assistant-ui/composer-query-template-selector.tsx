"use client";

import { FileText, Globe, Pin, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useAui } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TooltipIconButton } from "@/components/research-assistant-ui/tooltip-icon-button";
import useGetSearchSpaceQueryTemplates from "@/api/query-templates/hooks/useGetSearchSpaceQueryTemplates";
import type { QueryTemplate } from "@/api/query-templates/types";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

export function ComposerQueryTemplateSelector() {
	const { search_space_id } = useParams();
	const searchSpaceId = Number(search_space_id);
	const [isOpen, setIsOpen] = useState(false);
	const [localSearch, setLocalSearch] = useState("");
	const [skip, setSkip] = useState(0);
	const aui = useAui();

	const debouncedSearch = useDebounce(localSearch, DEBOUNCE_MS);
	const querySearch = debouncedSearch || undefined;

	const { data, isLoading } = useGetSearchSpaceQueryTemplates(
		searchSpaceId
			? {
					search_space_id: searchSpaceId,
					search: querySearch,
					skip: debouncedSearch !== localSearch ? 0 : skip,
					limit: PAGE_SIZE,
				}
			: null,
		{ enabled: !!searchSpaceId && isOpen },
	);

	const templates = data?.items ?? [];
	const total = data?.total ?? 0;
	const hasMore = skip + PAGE_SIZE < total;

	const pinnedTemplates = templates.filter((t) => t.is_pinned);
	const unpinnedTemplates = templates.filter((t) => !t.is_pinned);

	const handleSelect = useCallback(
		(template: QueryTemplate) => {
			aui.composer().setText(template.content);
			setIsOpen(false);
			setLocalSearch("");
			setSkip(0);
		},
		[aui],
	);

	const handleOpenChange = useCallback((open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setLocalSearch("");
			setSkip(0);
		}
	}, []);

	const handleLoadMore = useCallback(() => {
		setSkip((prev) => prev + PAGE_SIZE);
	}, []);

	return (
		<>
			<TooltipIconButton
				tooltip="Query templates"
				side="bottom"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				aria-label="Open query templates"
				onClick={() => setIsOpen(true)}
			>
				<FileText className="size-4" />
			</TooltipIconButton>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-2xl">
					<div className="space-y-4">
						<div>
							<DialogTitle className="text-xl">Query Templates</DialogTitle>
							<DialogDescription className="mt-1.5">
								Select a template to populate the message input
							</DialogDescription>
						</div>

						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search templates..."
								value={localSearch}
								onChange={(e) => {
									setLocalSearch(e.target.value);
									setSkip(0);
								}}
								className="pl-9"
							/>
						</div>

						{isLoading && templates.length === 0 ? (
							<div className="flex justify-center py-8">
								<div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
							</div>
						) : templates.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="rounded-full bg-muted p-4 mb-4">
									<FileText className="h-8 w-8 text-muted-foreground" />
								</div>
								<h4 className="text-sm font-medium mb-1">
									{localSearch.trim() ? "No templates match your search" : "No templates found"}
								</h4>
								<p className="text-xs text-muted-foreground max-w-xs">
									{localSearch.trim()
										? "Try a different search term."
										: "Create query templates in settings to quickly reuse common prompts."}
								</p>
							</div>
						) : (
							<div className="space-y-3 max-h-[60vh] overflow-y-auto">
								{pinnedTemplates.length > 0 && (
									<div className="space-y-2">
										<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
											<Pin className="h-3 w-3" />
											Pinned
										</div>
										{pinnedTemplates.map((template) => (
											<button
												key={template.id}
												onClick={() => handleSelect(template)}
												type="button"
												className="group relative flex items-start gap-3 p-3 rounded-lg border-2 border-amber-400/50 transition-all text-left hover:border-amber-400 hover:bg-accent/50"
											>
												<div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 flex-shrink-0">
													{template.icon ? (
														<span className="text-lg">{template.icon}</span>
													) : (
														<FileText className="h-5 w-5 text-amber-600" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-1">
														<p className="text-sm font-medium truncate">
															{template.title}
														</p>
														<Badge variant="outline" className="text-xs px-1.5 py-0.5 flex-shrink-0">
															<Pin className="h-3 w-3 mr-1" />
															Pinned
														</Badge>
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

								{unpinnedTemplates.length > 0 && (
									<div className="space-y-2">
						{pinnedTemplates.length > 0 && (
											<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
												All Templates
											</div>
										)}
										{unpinnedTemplates.map((template) => (
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

								{hasMore && (
									<div className="flex justify-center py-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={handleLoadMore}
											disabled={isLoading}
											className="text-xs"
										>
											{isLoading ? "Loading..." : `Load more (${total - skip - PAGE_SIZE} remaining)`}
										</Button>
									</div>
								)}
							</div>
						)}

						{total > 0 && (
							<DialogFooter className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground">
									Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
								</span>
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
		</>
	);
}
