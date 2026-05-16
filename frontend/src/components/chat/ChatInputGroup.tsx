"use client";

import { Brain, Check, FolderOpen, Send, Zap } from "lucide-react";
import { useParams } from "next/navigation";
import React, { Suspense, useCallback, useRef, useState } from "react";
import { DocumentsDataTable } from "@/components/chat/DocumentsDataTable";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import { useDocumentTypes } from "@/hooks/use-document-types";
import type { Document } from "@/hooks/use-documents";
import { useLLMConfigs, useLLMPreferences } from "@/hooks/use-llm-configs";
import { QueryTemplateSelector } from "@/components/chat/QueryTemplateSelector";

const DocumentSelector = React.memo(
	({
		onSelectionChange,
		selectedDocuments = [],
	}: {
		onSelectionChange?: (documents: Document[]) => void;
		selectedDocuments?: Document[];
	}) => {
		const { search_space_id } = useParams();
		const [isOpen, setIsOpen] = useState(false);

		const handleOpenChange = useCallback((open: boolean) => {
			setIsOpen(open);
		}, []);

		const handleSelectionChange = useCallback(
			(documents: Document[]) => {
				onSelectionChange?.(documents);
			},
			[onSelectionChange],
		);

		const handleDone = useCallback(() => {
			setIsOpen(false);
		}, []);

		const selectedCount = React.useMemo(
			() => selectedDocuments.length,
			[selectedDocuments.length],
		);

		return (
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-9 gap-2 px-3 border-dashed hover:border-solid hover:bg-accent/50 transition-all"
					>
						<FolderOpen className="h-4 w-4 text-muted-foreground" />
						<span className="text-xs font-medium">
							{selectedCount > 0 ? `Selected` : "Documents"}
						</span>
						{selectedCount > 0 && (
							<Badge
								variant="secondary"
								className="h-5 px-1.5 text-xs font-medium"
							>
								{selectedCount}
							</Badge>
						)}
					</Button>
				</DialogTrigger>

				<DialogContent className="max-w-[95vw] md:max-w-5xl h-[90vh] md:h-[85vh] p-0 flex flex-col">
					<div className="flex flex-col h-full">
						<div className="px-4 md:px-6 py-4 border-b flex-shrink-0 bg-muted/30">
							<DialogTitle className="text-lg md:text-xl font-semibold">
								Select Documents
							</DialogTitle>
							<DialogDescription className="mt-1.5 text-sm">
								Choose specific documents to include in your research context
							</DialogDescription>
						</div>

						<div className="flex-1 min-h-0 p-4 md:p-6">
							<DocumentsDataTable
								searchSpaceId={Number(search_space_id)}
								onSelectionChange={handleSelectionChange}
								onDone={handleDone}
								initialSelectedDocuments={selectedDocuments}
							/>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	},
);

DocumentSelector.displayName = "DocumentSelector";

const ConnectorSelector = React.memo(
	({
		onSelectionChange,
		selectedConnectors = [],
	}: {
		onSelectionChange?: (connectorTypes: string[]) => void;
		selectedConnectors?: string[];
	}) => {
		const { search_space_id } = useParams();
		const [isOpen, setIsOpen] = useState(false);

		// Don't use lazy loading - fetch document types on mount to populate the modal
		const { documentTypes, isLoading } = useDocumentTypes(
			Number(search_space_id),
			false, // Changed from true to false - always fetch document types
		);

		const handleOpenChange = useCallback((open: boolean) => {
			setIsOpen(open);
		}, []);

		const handleConnectorToggle = useCallback(
			(connectorType: string) => {
				const isSelected = selectedConnectors.includes(connectorType);
				const newSelection = isSelected
					? selectedConnectors.filter((type) => type !== connectorType)
					: [...selectedConnectors, connectorType];
				onSelectionChange?.(newSelection);
			},
			[selectedConnectors, onSelectionChange],
		);

		const handleSelectAll = useCallback(() => {
			onSelectionChange?.(documentTypes.map((dt) => dt.type));
		}, [documentTypes, onSelectionChange]);

		const handleClearAll = useCallback(() => {
			onSelectionChange?.([]);
		}, [onSelectionChange]);

		// Get display name for document type
		const getDisplayName = (type: string) => {
			return type
				.split("_")
				.map((word) => word.charAt(0) + word.slice(1).toLowerCase())
				.join(" ");
		};

		// Get selected document types with their counts
		const selectedDocTypes = documentTypes.filter((dt) =>
			selectedConnectors.includes(dt.type),
		);

		return (
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="relative h-9 gap-2 px-3 border-dashed hover:border-solid hover:bg-accent/50 transition-all"
					>
						<div className="flex items-center gap-1.5">
							{selectedDocTypes.length > 0 ? (
								<>
									<div className="flex items-center -space-x-2">
										{selectedDocTypes.slice(0, 3).map((docType) => (
											<div
												key={docType.type}
												className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted"
											>
												{getConnectorIcon(docType.type, "h-3 w-3")}
											</div>
										))}
									</div>
									<span className="text-xs font-medium">
										{selectedDocTypes.length}{" "}
										{selectedDocTypes.length === 1 ? "source" : "sources"}
									</span>
								</>
							) : (
								<>
									<Brain className="h-4 w-4 text-muted-foreground" />
									<span className="text-xs font-medium">Sources</span>
								</>
							)}
						</div>
					</Button>
				</DialogTrigger>

				<DialogContent className="sm:max-w-2xl">
					<div className="space-y-4">
						<div>
							<DialogTitle className="text-xl">
								Select Document Types
							</DialogTitle>
							<DialogDescription className="mt-1.5">
								Choose which document types to include in your search
							</DialogDescription>
						</div>

						{/* Document type selection grid */}
						<div className="grid grid-cols-2 gap-3">
							{isLoading ? (
								<div className="col-span-2 flex justify-center py-8">
									<div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
								</div>
							) : documentTypes.length === 0 ? (
								<div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
									<div className="rounded-full bg-muted p-4 mb-4">
										<Brain className="h-8 w-8 text-muted-foreground" />
									</div>
									<h4 className="text-sm font-medium mb-1">
										No documents found
									</h4>
									<p className="text-xs text-muted-foreground max-w-xs">
										Add documents to this search space to enable filtering by
										type
									</p>
								</div>
							) : (
								documentTypes.map((docType) => {
									const isSelected = selectedConnectors.includes(docType.type);

									return (
										<button
											key={docType.type}
											onClick={() => handleConnectorToggle(docType.type)}
											type="button"
											className={`group relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
												isSelected
													? "border-primary bg-primary/5 shadow-sm"
													: "border-border hover:border-primary/50 hover:bg-accent/50"
											}`}
										>
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
													isSelected
														? "bg-primary/10"
														: "bg-muted group-hover:bg-primary/5"
												}`}
											>
												{getConnectorIcon(
													docType.type,
													`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`,
												)}
											</div>
											<div className="flex-1 text-left min-w-0">
												<div className="flex items-center gap-2">
													<p className="text-sm font-medium truncate">
														{getDisplayName(docType.type)}
													</p>
													{isSelected && (
														<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
															<Check className="h-3 w-3 text-primary-foreground" />
														</div>
													)}
												</div>
												<p className="text-xs text-muted-foreground mt-0.5">
													{docType.count}{" "}
													{docType.count === 1 ? "document" : "documents"}
												</p>
											</div>
										</button>
									);
								})
							)}
						</div>

						{documentTypes.length > 0 && (
							<DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleClearAll}
									disabled={selectedConnectors.length === 0}
									className="text-xs"
								>
									Clear All
								</Button>
								<Button
									size="sm"
									onClick={handleSelectAll}
									disabled={selectedConnectors.length === documentTypes.length}
									className="text-xs"
								>
									Select All ({documentTypes.length})
								</Button>
							</DialogFooter>
						)}
					</div>
				</DialogContent>
			</Dialog>
		);
	},
);

ConnectorSelector.displayName = "ConnectorSelector";

export const LLMSelector = React.memo(() => {
	const { search_space_id } = useParams();
	const searchSpaceId = Number(search_space_id);

	const {
		llmConfigs,
		loading: llmLoading,
		error,
	} = useLLMConfigs(searchSpaceId);
	const {
		preferences,
		updatePreferences,
		loading: preferencesLoading,
	} = useLLMPreferences(searchSpaceId);

	const isLoading = llmLoading || preferencesLoading;

	// Memoize the selected config to avoid repeated lookups
	const selectedConfig = React.useMemo(() => {
		if (!preferences.fast_llm_id || !llmConfigs.length) return null;
		return (
			llmConfigs.find((config) => config.id === preferences.fast_llm_id) || null
		);
	}, [preferences.fast_llm_id, llmConfigs]);

	// Memoize the display value for the trigger
	const displayValue = React.useMemo(() => {
		if (!selectedConfig) return null;
		return (
			<div className="flex items-center gap-1">
				<span className="font-medium text-xs">{selectedConfig.provider}</span>
				<span className="text-muted-foreground">•</span>
				<span className="hidden sm:inline text-muted-foreground text-xs truncate max-w-[60px]">
					{selectedConfig.name}
				</span>
			</div>
		);
	}, [selectedConfig]);

	const handleValueChange = React.useCallback(
		(value: string) => {
			const llmId = value ? parseInt(value, 10) : undefined;
			updatePreferences({ fast_llm_id: llmId });
		},
		[updatePreferences],
	);

	// Loading skeleton
	if (isLoading) {
		return (
			<div className="h-8 min-w-[100px] sm:min-w-[120px]">
				<div className="h-8 rounded-md bg-muted animate-pulse flex items-center px-3">
					<div className="w-3 h-3 rounded bg-muted-foreground/20 mr-2" />
					<div className="h-3 w-16 rounded bg-muted-foreground/20" />
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="h-8 min-w-[100px] sm:min-w-[120px]">
				<Button
					variant="outline"
					size="sm"
					className="h-8 px-3 text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
					disabled
				>
					<span className="text-xs">Error</span>
				</Button>
			</div>
		);
	}

	return (
		<div className="h-8 min-w-0">
			<Select
				value={preferences.fast_llm_id?.toString() || ""}
				onValueChange={handleValueChange}
				disabled={isLoading}
			>
				<SelectTrigger className="h-8 w-auto min-w-[100px] sm:min-w-[120px] px-3 text-xs border-border bg-background hover:bg-muted/50 transition-colors duration-200 focus:ring-2 focus:ring-primary/20">
					<div className="flex items-center gap-2 min-w-0">
						<Zap className="h-3 w-3 text-primary flex-shrink-0" />
						<SelectValue placeholder="Fast LLM" className="text-xs">
							{displayValue || (
								<span className="text-muted-foreground">Select LLM</span>
							)}
						</SelectValue>
					</div>
				</SelectTrigger>

				<SelectContent align="end" className="w-[300px] max-h-[400px]">
					<div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
						<div className="flex items-center gap-2">
							<Zap className="h-3 w-3" />
							Fast LLM Selection
						</div>
					</div>

					{llmConfigs.length === 0 ? (
						<div className="px-4 py-6 text-center">
							<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
								<Brain className="h-5 w-5 text-muted-foreground" />
							</div>
							<h4 className="text-sm font-medium mb-1">
								No LLM configurations
							</h4>
							<p className="text-xs text-muted-foreground mb-3">
								Configure AI models to get started
							</p>
							<Button
								variant="outline"
								size="sm"
								className="text-xs"
								onClick={() => window.open("/settings", "_blank")}
							>
								Open Settings
							</Button>
						</div>
					) : (
						<div className="py-1">
							{llmConfigs.map((config) => (
								<SelectItem
									key={config.id}
									value={config.id.toString()}
									className="px-3 py-2 cursor-pointer hover:bg-accent/50 focus:bg-accent"
								>
									<div className="flex items-center justify-between w-full min-w-0">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
												<Brain className="h-4 w-4 text-primary" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span className="font-medium text-sm truncate">
														{config.name}
													</span>
													<Badge
														variant="outline"
														className="text-xs px-1.5 py-0.5 flex-shrink-0"
													>
														{config.provider}
													</Badge>
												</div>
												<p className="text-xs text-muted-foreground font-mono truncate">
													{config.model_name}
												</p>
											</div>
										</div>
									</div>
								</SelectItem>
							))}
						</div>
					)}
				</SelectContent>
			</Select>
		</div>
	);
});

LLMSelector.displayName = "LLMSelector";

export const CustomChatInputOptions = React.memo(
	({
		onDocumentSelectionChange,
		selectedDocuments,
		onConnectorSelectionChange,
		selectedConnectors,
		searchMode,
		onSearchModeChange,
		onSelectTemplate,
	}: {
		onDocumentSelectionChange?: (documents: Document[]) => void;
		selectedDocuments?: Document[];
		onConnectorSelectionChange?: (connectorTypes: string[]) => void;
		selectedConnectors?: string[];
		searchMode?: "DOCUMENTS" | "CHUNKS";
		onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
		onSelectTemplate?: (content: string) => void;
	}) => {
		const loadingFallback = React.useMemo(
			() => <div className="h-9 w-24 animate-pulse bg-muted/50 rounded-md" />,
			[],
		);

		return (
			<div className="flex flex-wrap gap-2 items-center">
				<div className="flex items-center gap-2">
					<Suspense fallback={loadingFallback}>
						<DocumentSelector
							onSelectionChange={onDocumentSelectionChange}
							selectedDocuments={selectedDocuments}
						/>
					</Suspense>
					<Suspense fallback={loadingFallback}>
						<ConnectorSelector
							onSelectionChange={onConnectorSelectionChange}
							selectedConnectors={selectedConnectors}
						/>
					</Suspense>
					{onSelectTemplate && (
						<Suspense fallback={loadingFallback}>
							<QueryTemplateSelector onSelectTemplate={onSelectTemplate} />
						</Suspense>
					)}
				</div>
			</div>
		);
	},
);

CustomChatInputOptions.displayName = "CustomChatInputOptions";

export const ChatInputUI = React.memo(
	({
		onDocumentSelectionChange,
		selectedDocuments,
		onConnectorSelectionChange,
		selectedConnectors,
		searchMode,
		onSearchModeChange,
		onSubmit,
		isLoading,
		value,
		onInputChange,
		onSelectTemplate,
	}: {
		onDocumentSelectionChange?: (documents: Document[]) => void;
		selectedDocuments?: Document[];
		onConnectorSelectionChange?: (connectorTypes: string[]) => void;
		selectedConnectors?: string[];
		searchMode?: "DOCUMENTS" | "CHUNKS";
		onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
		onSubmit?: (message: string) => void;
		isLoading?: boolean;
		value?: string;
		onInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
		onSelectTemplate?: (content: string) => void;
	}) => {
		const [internalInput, setInternalInput] = useState("");
		const textareaRef = useRef<HTMLTextAreaElement>(null);

		const isControlled = value !== undefined;
		const inputValue = isControlled ? value : internalInput;

		const handleInputChange = useCallback(
			(e: React.ChangeEvent<HTMLTextAreaElement>) => {
				if (onInputChange) {
					onInputChange(e);
				}
				if (!isControlled) {
					setInternalInput(e.target.value);
				}
			},
			[isControlled, onInputChange],
		);

		const handleTemplateSelect = useCallback(
			(content: string) => {
				if (isControlled) {
					const nativeEvent = new Event("input", { bubbles: true });
					const textarea = textareaRef.current;
					if (textarea) {
						const setter = Object.getOwnPropertyDescriptor(
							window.HTMLTextAreaElement.prototype,
							"value",
						)?.set;
						setter?.call(textarea, content);
						textarea.dispatchEvent(nativeEvent);
					}
					if (onInputChange) {
						onInputChange({
							target: { value: content },
						} as React.ChangeEvent<HTMLTextAreaElement>);
					}
				} else {
					setInternalInput(content);
				}
				onSelectTemplate?.(content);
			},
			[isControlled, onInputChange, onSelectTemplate],
		);

		const handleSubmit = useCallback(
			(e: React.FormEvent) => {
				e.preventDefault();
				if (inputValue.trim() && !isLoading) {
					onSubmit?.(inputValue);
					if (!isControlled) {
						setInternalInput("");
					}
				}
			},
			[inputValue, isLoading, onSubmit, isControlled],
		);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					if (inputValue.trim() && !isLoading) {
						onSubmit?.(inputValue);
						if (!isControlled) {
							setInternalInput("");
						}
					}
				}
			},
			[inputValue, isLoading, onSubmit, isControlled],
		);

		return (
			<div className="flex flex-col gap-3">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<textarea
						ref={textareaRef}
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder="Ask a question..."
						disabled={isLoading}
						rows={1}
						className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						style={{
							minHeight: "44px",
							maxHeight: "200px",
						}}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={!inputValue.trim() || isLoading}
						className="h-11 w-11 shrink-0"
					>
						<Send className="h-4 w-4" />
					</Button>
				</form>
				<CustomChatInputOptions
					onDocumentSelectionChange={onDocumentSelectionChange}
					selectedDocuments={selectedDocuments}
					onConnectorSelectionChange={onConnectorSelectionChange}
					selectedConnectors={selectedConnectors}
					searchMode={searchMode}
					onSearchModeChange={onSearchModeChange}
					onSelectTemplate={handleTemplateSelect}
				/>
			</div>
		);
	},
);

ChatInputUI.displayName = "ChatInputUI";
