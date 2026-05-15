"use client";

import {
	ActionBarPrimitive,
	AuiIf,
	BranchPickerPrimitive,
	ComposerPrimitive,
	ErrorPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
	useAui,
	useAuiState,
} from "@assistant-ui/react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	LoaderIcon,
	MicIcon,
	PencilIcon,
	Pin,
	SquareIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
	Undo2,
	XIcon,
} from "lucide-react";
import "@assistant-ui/react-markdown/styles/dot.css";
import { createContext, useContext } from "react";

import {
	ComposerAddAttachment,
	ComposerAttachments,
	UserMessageAttachments,
} from "@/components/research-assistant-ui/attachment";
import { MarkdownText } from "@/components/research-assistant-ui/markdown-text";
import { QuestionContent } from "@/components/research-assistant-ui/question-content";
import {
	Reasoning,
	ReasoningGroup,
} from "@/components/research-assistant-ui/reasoning";
import { Sources } from "@/components/research-assistant-ui/sources";
import { ToolFallback } from "@/components/research-assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/research-assistant-ui/tooltip-icon-button";
import { ComposerQueryTemplateSelector } from "@/components/research-assistant-ui/composer-query-template-selector";
import { CustomChatInputOptions } from "@/components/chat/ChatInputGroup";
import { Button } from "@/components/ui/button";
import useGetSearchSpaceQueryTemplates from "@/api/query-templates/hooks/useGetSearchSpaceQueryTemplates";
import type { QueryTemplate } from "@/api/query-templates/types";
import type { Document } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

function SuggestionButton({
	prompt,
	className,
	children,
}: {
	prompt: string;
	className?: string;
	children: React.ReactNode;
}) {
	const aui = useAui();
	const handleClick = () => {
		aui.thread().append({
			content: [{ type: "text", text: prompt }],
		});
	};
	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"cursor-pointer rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted",
				className,
			)}
		>
			{children}
		</button>
	);
}

type UndoActionContextValue = {
	onDiscardUserMessage?: (userMessageIndex: number) => void;
	followUpQuestions?: string[];
};

const UndoActionContext = createContext<UndoActionContextValue>({});

export function Thread({
	emptyMessagesPlaceholder,
	onDiscardUserMessage,
	onDocumentSelectionChange,
	selectedDocuments,
	onConnectorSelectionChange,
	selectedConnectors,
	searchMode,
	onSearchModeChange,
	followUpQuestions = [],
	searchSpaceId,
}: {
	emptyMessagesPlaceholder?: React.ReactNode;
	onDiscardUserMessage?: (userMessageIndex: number) => void;
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
	followUpQuestions?: string[];
	searchSpaceId?: number;
}) {
	return (
		<UndoActionContext.Provider value={{ onDiscardUserMessage, followUpQuestions }}>
			<ThreadPrimitive.Root
				className="flex h-full flex-col bg-background text-sm"
				style={
					{
						"--thread-max-width": "44rem",
						"--accent-color": "#0ea5e9",
						"--accent-foreground": "#000000",
					} as React.CSSProperties
				}
			>
				<ThreadPrimitive.Viewport
					turnAnchor="top"
					autoScroll
					scrollToBottomOnRunStart
					scrollToBottomOnInitialize
					scrollToBottomOnThreadSwitch
					className="relative flex flex-1 min-h-0 flex-col overflow-y-auto scroll-smooth px-4 pt-4"
					style={{ scrollbarGutter: "stable" }}
				>
					<AuiIf condition={(s) => s.thread.isEmpty}>
						<ThreadWelcome placeholder={emptyMessagesPlaceholder} searchSpaceId={searchSpaceId} />
					</AuiIf>

					<ThreadPrimitive.Messages
						components={{
							UserMessage,
							EditComposer,
							AssistantMessage,
							AssistantAvatar: () => null,
						}}
					/>

				<ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4">
					<ThreadScrollToBottom />
					<Composer />
					<CustomChatInputOptions
						onDocumentSelectionChange={onDocumentSelectionChange}
						selectedDocuments={selectedDocuments}
						onConnectorSelectionChange={onConnectorSelectionChange}
						selectedConnectors={selectedConnectors}
						searchMode={searchMode}
						onSearchModeChange={onSearchModeChange}
					/>
				</ThreadPrimitive.ViewportFooter>
				</ThreadPrimitive.Viewport>
			</ThreadPrimitive.Root>
		</UndoActionContext.Provider>
	);
}

function ThreadWelcome({ placeholder, searchSpaceId }: { placeholder?: React.ReactNode; searchSpaceId?: number }) {
	const { data } = useGetSearchSpaceQueryTemplates(
		searchSpaceId ? { search_space_id: searchSpaceId, limit: 100 } : null,
		{ enabled: !!searchSpaceId },
	);

	const pinnedTemplates = (data?.items ?? []).filter((t: QueryTemplate) => t.is_pinned);

	if (placeholder) return <>{placeholder}</>;

	return (
		<div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
			<div className="flex size-full flex-col justify-center px-8">
				<div className="text-2xl font-semibold">Hello there!</div>
				<div className="text-2xl text-muted-foreground/65">
					How can I help you today?
				</div>
			</div>
			<div className="grid w-full gap-2 pb-4 md:grid-cols-2">
				{pinnedTemplates.length > 0
					? pinnedTemplates.map((template: QueryTemplate) => (
							<SuggestionButton
								key={template.id}
								prompt={template.content}
								className="h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border px-5 py-4 text-left text-sm"
							>
								<span className="font-medium flex items-center gap-1.5">
									<Pin className="h-3.5 w-3.5 text-amber-500" />
									{template.icon && <span className="mr-1">{template.icon}</span>}
									{template.title}
								</span>
								{template.description && (
									<span className="text-muted-foreground">{template.description}</span>
								)}
							</SuggestionButton>
						))
					: <>
							<SuggestionButton
								prompt="What's the weather in San Francisco?"
								className="h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border px-5 py-4 text-left text-sm"
							>
								<span className="font-medium">What's the weather</span>
								<span className="text-muted-foreground">in San Francisco?</span>
							</SuggestionButton>
							<SuggestionButton
								prompt="What are the top news headlines today?"
								className="h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border px-5 py-4 text-left text-sm"
							>
								<span className="font-medium">What are the top news</span>
								<span className="text-muted-foreground">headlines today?</span>
							</SuggestionButton>
						</>
				}
			</div>
		</div>
	);
}

function Composer() {
	return (
		<ComposerPrimitive.Root className="relative flex w-full flex-col">
			<ComposerPrimitive.AttachmentDropzone className="flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
				<ComposerAttachments />
				<ComposerPrimitive.Quote className="mx-3 mt-1 flex items-start gap-2 rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
					<ComposerPrimitive.QuoteText className="line-clamp-3 flex-1" />
					<ComposerPrimitive.QuoteDismiss className="shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:text-foreground">
						<XIcon className="size-3.5" />
					</ComposerPrimitive.QuoteDismiss>
				</ComposerPrimitive.Quote>
				<ComposerPrimitive.Input
					placeholder="Send a message..."
					className="mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
					rows={1}
					autoFocus
					aria-label="Message input"
				/>
				<ComposerAction />
			</ComposerPrimitive.AttachmentDropzone>
		</ComposerPrimitive.Root>
	);
}

function ComposerAction() {
	return (
		<div className="relative mx-2 mb-2 flex items-center justify-between">
			<div className="flex items-center gap-1">
				<ComposerAddAttachment />
				<ComposerQueryTemplateSelector />
				<AuiIf condition={(s) => s.composer.dictation == null}>
					<ComposerPrimitive.Dictate asChild>
						<TooltipIconButton
							tooltip="Start voice input"
							side="bottom"
							variant="ghost"
							size="icon"
							className="size-8 rounded-full"
							aria-label="Start voice input"
						>
							<MicIcon className="size-4" />
						</TooltipIconButton>
					</ComposerPrimitive.Dictate>
				</AuiIf>

				<AuiIf condition={(s) => s.composer.dictation != null}>
					<ComposerPrimitive.StopDictation asChild>
						<TooltipIconButton
							tooltip="Stop voice input"
							side="bottom"
							variant="ghost"
							size="icon"
							className="size-8 rounded-full"
							aria-label="Stop voice input"
						>
							<SquareIcon className="size-3.5 animate-pulse fill-current" />
						</TooltipIconButton>
					</ComposerPrimitive.StopDictation>
				</AuiIf>
			</div>

			<AuiIf condition={(s) => !s.thread.isRunning}>
				<ComposerPrimitive.Send asChild>
					<TooltipIconButton
						tooltip="Send message"
						side="bottom"
						variant="default"
						size="icon"
						className="size-8 rounded-full"
						style={{
							backgroundColor: "var(--accent-color)",
							color: "var(--accent-foreground)",
						}}
						aria-label="Send message"
					>
						<ArrowUpIcon className="size-4" />
					</TooltipIconButton>
				</ComposerPrimitive.Send>
			</AuiIf>

			<AuiIf condition={(s) => s.thread.isRunning}>
				<ComposerPrimitive.Cancel asChild>
					<Button
						type="button"
						variant="default"
						size="icon"
						className="size-8 rounded-full"
						style={{
							backgroundColor: "var(--accent-color)",
							color: "var(--accent-foreground)",
						}}
						aria-label="Stop generating"
					>
						<SquareIcon className="size-3 fill-current" />
					</Button>
				</ComposerPrimitive.Cancel>
			</AuiIf>
		</div>
	);
}

function ThreadScrollToBottom() {
	return (
		<ThreadPrimitive.ScrollToBottom asChild>
			<TooltipIconButton
				tooltip="Scroll to bottom"
				variant="outline"
				className="absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
			>
				<ArrowDownIcon />
			</TooltipIconButton>
		</ThreadPrimitive.ScrollToBottom>
	);
}

function UserMessage() {
	const { onDiscardUserMessage } = useContext(UndoActionContext);
	const messageIndex = useAuiState((s) => s.message.index);
	const userMessageIndex = useAuiState((s) => {
		return (
			s.thread.messages
				.slice(0, s.message.index + 1)
				.filter((message) => message.role === "user").length - 1
		);
	});

	return (
		<MessagePrimitive.Root
			className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-1 fade-in slide-in-from-bottom-1 animate-in duration-150"
			data-role="user"
		>
			<UserMessageAttachments />

			<div className="relative col-start-2 min-w-0">
				<MessagePrimitive.Quote className="mb-1.5 rounded-md border-l-2 border-primary/50 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground italic" />
				<div className="rounded-2xl bg-muted px-4 py-2.5 break-words text-foreground">
					<MessagePrimitive.Parts />
				</div>
				<div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
				<UserActionBar
					onDiscardUserMessage={onDiscardUserMessage}
					messageIndex={messageIndex}
					userMessageIndex={userMessageIndex}
				/>
				</div>
			</div>
		</MessagePrimitive.Root>
	);
}

function UserActionBar({
	onDiscardUserMessage,
	messageIndex,
	userMessageIndex,
}: {
	onDiscardUserMessage?: (userMessageIndex: number) => void;
	messageIndex: number;
	userMessageIndex: number;
}) {
	const isUserMessage = useAuiState((s) => s.message.role === "user");
	const isLastUserMessage = useAuiState((s) => {
		const msgs = s.thread.messages;
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].role === "user") return msgs[i].id === s.message.id;
		}
		return false;
	});
	const isThreadRunning = useAuiState((s) => s.thread.isRunning);
	const canEdit = isLastUserMessage && !isThreadRunning;
	const isUndoVisible =
		isUserMessage &&
		typeof onDiscardUserMessage === "function" &&
		Number.isInteger(messageIndex) &&
		Number.isInteger(userMessageIndex) &&
		userMessageIndex >= 0;

	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="flex flex-row items-center"
		>
			{isUndoVisible ? (
				<TooltipIconButton
					tooltip="Reset chat to this point"
					className="p-4"
					onClick={() => onDiscardUserMessage?.(userMessageIndex)}
				>
					<Undo2 />
				</TooltipIconButton>
			) : null}
			{canEdit && (
				<ActionBarPrimitive.Edit asChild>
					<TooltipIconButton tooltip="Edit" className="p-4">
						<PencilIcon />
					</TooltipIconButton>
				</ActionBarPrimitive.Edit>
			)}
		</ActionBarPrimitive.Root>
	);
}

function EditComposer() {
	return (
		<MessagePrimitive.Root className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-3">
			<ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
				<ComposerPrimitive.Input
					className="min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
					autoFocus
				/>
				<div className="mx-3 mb-3 flex items-center gap-2 self-end">
					<ComposerPrimitive.Cancel asChild>
						<Button variant="ghost" size="sm">
							Cancel
						</Button>
					</ComposerPrimitive.Cancel>
					<ComposerPrimitive.Send asChild>
						<Button size="sm">Update</Button>
					</ComposerPrimitive.Send>
				</div>
			</ComposerPrimitive.Root>
		</MessagePrimitive.Root>
	);
}

function AssistantMessage() {
	const { followUpQuestions } = useContext(UndoActionContext);
	return (
		<MessagePrimitive.Root
			className="relative mx-auto w-full max-w-[var(--thread-max-width)] py-3 fade-in slide-in-from-bottom-1 animate-in duration-150"
			data-role="assistant"
		>
			<div className="break-words px-2 leading-relaxed text-foreground">
				<MessagePrimitive.Parts
					components={{
						Text: MarkdownText,
						tools: {
							Fallback: ToolFallback,
						},
						Reasoning,
						ReasoningGroup,
						Source: Sources,
						data: {
							by_name: {
								question: (props: { data?: Record<string, unknown> }) => (
									<QuestionContent
										part={{
											type: "question",
											text:
												typeof props.data?.text === "string"
													? props.data.text
													: "",
											options: Array.isArray(props.data?.options)
												? (props.data.options as string[])
												: undefined,
											questions: Array.isArray(props.data?.questions)
												? (props.data.questions as {
														text: string;
														options: string[];
														multiple?: boolean;
													}[])
												: undefined,
											answer:
												typeof props.data?.answer === "string"
													? props.data.answer
													: undefined,
										}}
									/>
								),
							},
						},
					}}
				/>
				<MessageError />
				<AuiIf
					condition={(s) =>
						s.thread.isRunning &&
						!s.message.content.some((p) => p.type === "text") &&
						!s.message.content.some((p) => p.type === "tool-call")
					}
				>
					<div className="flex items-center gap-2 text-muted-foreground">
						<LoaderIcon className="size-4 animate-spin" />
						<span className="text-sm">Thinking...</span>
					</div>
				</AuiIf>
			</div>

			<AuiIf
				condition={(s) =>
					s.message.status?.type !== "running" &&
					s.message.status?.reason !== "error" &&
					s.message.content.some((p) => p.type === "text")
				}
			>
				<div className="mt-1 ml-2 flex min-h-6 items-center">
					<AuiIf condition={(s) => s.message.isLast}>
						<BranchPicker />
					</AuiIf>

					<AssistantActionBar />
				</div>
			</AuiIf>

			<AuiIf
				condition={(s) =>
					s.message.isLast &&
					!s.thread.isRunning &&
					s.message.status?.reason !== "error" &&
					s.message.content.some((p) => p.type === "text")
				}
			>
				<div className="mt-4 flex flex-wrap gap-2">
					{followUpQuestions && followUpQuestions.length > 0 ? (
						followUpQuestions.map((q) => (
							<SuggestionButton key={q} prompt={q}>
								{q}
							</SuggestionButton>
						))
					) : (
						<>
							<SuggestionButton prompt="Tell me more">
								Tell me more
							</SuggestionButton>
							<SuggestionButton prompt="Can you explain differently?">
								Explain differently
							</SuggestionButton>
						</>
					)}
				</div>
			</AuiIf>
		</MessagePrimitive.Root>
	);
}

function MessageError() {
	return (
		<MessagePrimitive.Error>
			<ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
				<ErrorPrimitive.Message className="line-clamp-2" />
			</ErrorPrimitive.Root>
		</MessagePrimitive.Error>
	);
}

function AssistantActionBar() {
	const _isLast = useAuiState((s) => s.message.isLast);

	return (
		<ActionBarPrimitive.Root className="-ml-1 flex gap-1 text-muted-foreground">
			<ActionBarPrimitive.Copy asChild>
				<TooltipIconButton tooltip="Copy">
					<AuiIf condition={(s) => s.message.isCopied}>
						<CheckIcon />
					</AuiIf>
					<AuiIf condition={(s) => !s.message.isCopied}>
						<CopyIcon />
					</AuiIf>
				</TooltipIconButton>
			</ActionBarPrimitive.Copy>
			<ActionBarPrimitive.ExportMarkdown asChild>
				<TooltipIconButton tooltip="Export as Markdown">
					<DownloadIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.ExportMarkdown>
			{/* TODO: Re-enable regenerate with branching support in a later PR */}
			{/* {isLast && (
				<ActionBarPrimitive.Reload asChild>
					<TooltipIconButton tooltip="Refresh">
						<RefreshCwIcon />
					</TooltipIconButton>
				</ActionBarPrimitive.Reload>
			)} */}

			<ActionBarPrimitive.FeedbackPositive asChild>
				<TooltipIconButton tooltip="Good response">
					<ThumbsUpIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.FeedbackPositive>
			<ActionBarPrimitive.FeedbackNegative asChild>
				<TooltipIconButton tooltip="Bad response">
					<ThumbsDownIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.FeedbackNegative>
		</ActionBarPrimitive.Root>
	);
}

function BranchPicker({ className, ...rest }: { className?: string }) {
	return (
		<BranchPickerPrimitive.Root
			hideWhenSingleBranch
			className={cn(
				"mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
				className,
			)}
			{...rest}
		>
			<BranchPickerPrimitive.Previous asChild>
				<TooltipIconButton tooltip="Previous">
					<ChevronLeftIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Previous>
			<span className="font-medium">
				<BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
			</span>
			<BranchPickerPrimitive.Next asChild>
				<TooltipIconButton tooltip="Next">
					<ChevronRightIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Next>
		</BranchPickerPrimitive.Root>
	);
}
