"use client";

import type { Message } from "@langchain/core/messages";
import { ArrowDownIcon, ArrowUpIcon, SquareIcon } from "lucide-react";
import {
	type FC,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	type ChatAttachment,
	ComposerAddAttachment,
	ComposerAttachments,
} from "@/components/assistant-ui/attachment";
import {
	DocumentMentionPicker,
	type DocumentMentionPickerRef,
} from "@/components/assistant-ui/document-mention-picker";
import {
	InlineMentionEditor,
	type InlineMentionEditorRef,
	type MentionedDocument,
} from "@/components/assistant-ui/inline-mention-editor";
import { AnimatedEmptyState } from "@/components/chat/AnimatedEmptyState";
import { CustomChatInputOptions } from "@/components/chat/ChatInputGroup";
import { Button } from "@/components/ui/button";
import type { ThinkingStep, ToolCallState } from "@/hooks/use-chat-stream";
import type { Document } from "@/hooks/use-documents";
import { useRestoredToolCalls } from "@/hooks/use-restored-tool-calls";
import { toRenderableMessages } from "@/lib/chat/message-adapter";
import { AssistantMessage } from "./assistant-message";
import { TooltipIconButton } from "./tooltip-icon-button";
import { UserMessage } from "./user-message";

interface ThreadProps {
	messages: Message[];
	isRunning: boolean;
	onSubmit: (message: string) => void;
	onCancel?: () => void;
	onReloadLast?: (message: Message) => void;
	onEditUserSubmit?: (message: Message, editedContent: string) => void;
	searchSpaceId: number;
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
	header?: ReactNode;
	toolCallsByMessage?: Map<Message, ToolCallState[]>;
	thinkingSteps?: ThinkingStep[];
}

export const Thread: FC<ThreadProps> = ({
	messages,
	isRunning,
	onSubmit,
	onCancel,
	onReloadLast,
	onEditUserSubmit,
	searchSpaceId,
	onDocumentSelectionChange,
	selectedDocuments,
	onConnectorSelectionChange,
	selectedConnectors,
	searchMode,
	onSearchModeChange,
	header,
	toolCallsByMessage,
	thinkingSteps,
}) => {
	const viewportRef = useRef<HTMLDivElement>(null);
	const renderableMessages = useMemo(
		() => toRenderableMessages(messages),
		[messages],
	);
	const isEmpty = renderableMessages.length === 0;
	const [isScrolledUp, setIsScrolledUp] = useState(false);

	const checkScrollPosition = useCallback(() => {
		const container = viewportRef.current;
		if (!container) return false;
		const { scrollTop, scrollHeight, clientHeight } = container;
		const tolerance = 140;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
		return distanceFromBottom > tolerance;
	}, []);

	const handleScroll = useCallback(() => {
		const scrolledUp = checkScrollPosition();
		setIsScrolledUp(scrolledUp);
	}, [checkScrollPosition]);

	const restoredToolCalls = useRestoredToolCalls(renderableMessages);

	const mergedToolCalls = useMemo(() => {
		const merged = new Map<Message, ToolCallState[]>();
		Array.from(restoredToolCalls.entries()).forEach(([key, value]) => {
			merged.set(key, value);
		});
		if (toolCallsByMessage) {
			Array.from(toolCallsByMessage.entries()).forEach(([key, value]) => {
				merged.set(key, value);
			});
		}
		return merged;
	}, [toolCallsByMessage, restoredToolCalls]);

	// Intentionally do not auto-scroll when streaming finishes.

	const handleSubmit = (message: string) => {
		onSubmit(message);

		setTimeout(() => {
			if (viewportRef.current) {
				viewportRef.current.scrollTo({
					top: viewportRef.current.scrollHeight,
					behavior: "smooth",
				});
			}
		}, 100);
	};

	const handleEditUserSubmit = useCallback(
		(message: Message, editedContent: string) => {
			onEditUserSubmit?.(message, editedContent);

			setTimeout(() => {
				if (viewportRef.current) {
					viewportRef.current.scrollTo({
						top: viewportRef.current.scrollHeight,
						behavior: "smooth",
					});
				}
			}, 100);
		},
		[onEditUserSubmit],
	);

	return (
		<div
			className="aui-root aui-thread-root @container flex h-full min-h-0 flex-col bg-background"
			style={{
				["--thread-max-width" as string]: "44rem",
			}}
		>
			<div
				ref={viewportRef}
				onScroll={handleScroll}
				className="aui-thread-viewport relative flex flex-1 min-h-0 flex-col overflow-y-auto px-4 pt-4 transition-[padding] duration-300 ease-out"
			>
				{header && <div className="sticky top-0 z-10 mb-4">{header}</div>}

				{isEmpty ? (
					<div className="aui-thread-welcome-root mx-auto flex w-full max-w-(--thread-max-width) grow flex-col items-center px-4 relative">
						<div className="flex-1 flex items-center justify-center w-full">
							<AnimatedEmptyState />
						</div>
						<div className="w-full pb-4 md:pb-6">
							<ThreadComposer
								searchSpaceId={searchSpaceId}
								onDocumentSelectionChange={onDocumentSelectionChange}
								selectedDocuments={selectedDocuments}
								onConnectorSelectionChange={onConnectorSelectionChange}
								selectedConnectors={selectedConnectors}
								searchMode={searchMode}
								onSearchModeChange={onSearchModeChange}
								onSubmit={handleSubmit}
								onCancel={onCancel}
								isRunning={isRunning}
							/>
						</div>
					</div>
				) : (
					<>
						{renderableMessages.map((message, index) => {
							const isLast = index === renderableMessages.length - 1;
							if (message.type === "human") {
								return (
									<UserMessage
										key={message.id || index}
										message={message}
										onEditSubmit={handleEditUserSubmit}
									/>
								);
							}
							return (
								<AssistantMessage
									key={message.id || index}
									message={message}
									isLast={isLast}
									isStreaming={isRunning}
									onReload={onReloadLast}
									toolCalls={mergedToolCalls.get(message)}
									thinkingSteps={isLast ? thinkingSteps : undefined}
								/>
							);
						})}

						{isRunning && (
							<div className="min-h-[max(50px,calc(100svh-420px))]"></div>
						)}

						<div className="sticky bottom-0 z-10 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6">
							{isScrolledUp && (
								<TooltipIconButton
									tooltip="Scroll to bottom"
									variant="outline"
									className="-top-12 absolute z-10 self-center rounded-full p-4 dark:bg-background dark:hover:bg-accent"
									onClick={() => {
										if (!viewportRef.current) return;
										viewportRef.current.scrollTo({
											top: viewportRef.current.scrollHeight,
											behavior: "smooth",
										});
									}}
								>
									<ArrowDownIcon />
								</TooltipIconButton>
							)}

							<div className="fade-in slide-in-from-bottom-4 animate-in duration-500 ease-out fill-mode-both border-t pt-4">
								<ThreadComposer
									searchSpaceId={searchSpaceId}
									onDocumentSelectionChange={onDocumentSelectionChange}
									selectedDocuments={selectedDocuments}
									onConnectorSelectionChange={onConnectorSelectionChange}
									selectedConnectors={selectedConnectors}
									searchMode={searchMode}
									onSearchModeChange={onSearchModeChange}
									onSubmit={handleSubmit}
									onCancel={onCancel}
									isRunning={isRunning}
								/>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

interface ThreadComposerProps {
	searchSpaceId: number;
	onSubmit: (message: string) => void;
	onCancel?: () => void;
	isRunning: boolean;
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
}

const ThreadComposer: FC<ThreadComposerProps> = ({
	searchSpaceId,
	onSubmit,
	onCancel,
	isRunning,
	onDocumentSelectionChange,
	selectedDocuments = [],
	onConnectorSelectionChange,
	selectedConnectors,
	searchMode,
	onSearchModeChange,
}) => {
	const editorRef = useRef<InlineMentionEditorRef>(null);
	const editorContainerRef = useRef<HTMLDivElement>(null);
	const documentPickerRef = useRef<DocumentMentionPickerRef>(null);
	const [showDocumentPopover, setShowDocumentPopover] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [draftText, setDraftText] = useState("");
	const [mentionedDocs, setMentionedDocs] = useState<MentionedDocument[]>([]);
	const [attachments, setAttachments] = useState<ChatAttachment[]>([]);


	const hasContent = draftText.trim().length > 0 || attachments.length > 0;

	const handleMentionTrigger = (query: string) => {
		setShowDocumentPopover(true);
		setMentionQuery(query);
	};

	const handleMentionClose = () => {
		setShowDocumentPopover(false);
		setMentionQuery("");
	};

	const handleEditorKeyDown = (e: KeyboardEvent) => {
		if (!showDocumentPopover) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			documentPickerRef.current?.moveDown();
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			documentPickerRef.current?.moveUp();
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			documentPickerRef.current?.selectHighlighted();
			return;
		}
		if (e.key === "Escape") {
			e.preventDefault();
			setShowDocumentPopover(false);
			setMentionQuery("");
		}
	};

	const handleSend = () => {
		if (isRunning || !hasContent) return;

		const text = editorRef.current?.getText() || "";
		const attachmentSuffix =
			attachments.length > 0
				? `\n\nAttachments: ${attachments.map((a) => `[${a.name}]`).join(" ")}`
				: "";
		const mentionSuffix =
			mentionedDocs.length > 0
				? `\n\nMentioned documents: ${mentionedDocs.map((d) => `[${d.title}]`).join(" ")}`
				: "";

		onSubmit(`${text}${mentionSuffix}${attachmentSuffix}`.trim());
		editorRef.current?.clear();
		setDraftText("");
		setMentionedDocs([]);
		setAttachments([]);
		setShowDocumentPopover(false);
		setMentionQuery("");
	};

	return (
		<div className="relative flex w-full flex-col gap-2">
			<div className="flex w-full flex-col rounded-2xl border-input bg-muted px-1 pt-2">
				<ComposerAttachments
					attachments={attachments}
					onRemove={(id) =>
						setAttachments((prev) => prev.filter((a) => a.id !== id))
					}
				/>
				<div ref={editorContainerRef} className="px-3 pt-3 pb-4">
					<InlineMentionEditor
						ref={editorRef}
						placeholder="Ask anything or @mention docs."
						onMentionTrigger={handleMentionTrigger}
						onMentionClose={handleMentionClose}
						onChange={(text, docs) => {
							setDraftText(text);
							setMentionedDocs(docs);
							if (docs.length > 0) {
								onDocumentSelectionChange?.(docs as Document[]);
							}
						}}
						onSubmit={handleSend}
						onKeyDown={handleEditorKeyDown}
						className="min-h-[24px]"
						disabled={isRunning}
					/>
				</div>

				{showDocumentPopover &&
					typeof document !== "undefined" &&
					createPortal(
						<DocumentMentionPicker
							ref={documentPickerRef}
							searchSpaceId={searchSpaceId}
							onSelectionChange={(docs) => {
								const last = docs[docs.length - 1];
								if (last) {
									editorRef.current?.insertDocumentChip(last);
								}
							}}
							onDone={() => {
								setShowDocumentPopover(false);
								setMentionQuery("");
							}}
							initialSelectedDocuments={selectedDocuments}
							externalSearch={mentionQuery}
							containerStyle={{
								bottom: editorContainerRef.current
									? `${window.innerHeight - editorContainerRef.current.getBoundingClientRect().top + 8}px`
									: "200px",
								left: editorContainerRef.current
									? `${editorContainerRef.current.getBoundingClientRect().left}px`
									: "50%",
							}}
						/>,
						document.body,
					)}
			</div>

			<div className="relative mx-2 mb-2 flex items-center justify-between">
				<div className="flex items-center gap-1">
					<ComposerAddAttachment
						onAdd={(incoming) => {
							setAttachments((prev) => [...prev, ...incoming]);
						}}
					/>
				</div>

				{!isRunning ? (
					<TooltipIconButton
						tooltip={hasContent ? "Send message" : "Enter a message to send"}
						side="bottom"
						type="button"
						variant="default"
						size="icon"
						className="size-8 rounded-full"
						disabled={!hasContent}
						onClick={handleSend}
					>
						<ArrowUpIcon className="size-4" />
					</TooltipIconButton>
				) : (
					<Button
						type="button"
						variant="default"
						size="icon"
						className="size-8 rounded-full"
						onClick={onCancel}
						aria-label="Stop generating"
					>
						<SquareIcon className="size-3 fill-current" />
					</Button>
				)}
			</div>

			<CustomChatInputOptions
				onDocumentSelectionChange={onDocumentSelectionChange}
				selectedDocuments={selectedDocuments}
				onConnectorSelectionChange={onConnectorSelectionChange}
				selectedConnectors={selectedConnectors}
				searchMode={searchMode}
				onSearchModeChange={onSearchModeChange}
			/>
		</div>
	);
};
