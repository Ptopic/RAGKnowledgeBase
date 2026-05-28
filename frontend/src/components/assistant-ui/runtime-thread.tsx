"use client";

import {
	ActionBarPrimitive,
	ComposerPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
} from "@assistant-ui/react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CopyIcon,
	DownloadIcon,
	PencilIcon,
	SquareIcon,
} from "lucide-react";
import { ToolCallRenderer } from "@/components/assistant-ui/tool-call-renderer";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ChatHeader } from "@/components/new-chat/chat-header";
import { Sources } from "@/components/research-assistant-ui/sources";
import { Button } from "@/components/ui/button";

export function RuntimeThread() {
	return (
		<ThreadPrimitive.Root
			className="flex h-full flex-col bg-background text-sm"
			style={{
				["--thread-max-width" as string]: "44rem",
				["--accent-color" as string]: "#0ea5e9",
				["--accent-foreground" as string]: "#000000",
			}}
		>
			<ThreadPrimitive.Viewport
				turnAnchor="top"
				autoScroll
				scrollToBottomOnRunStart
				scrollToBottomOnInitialize
				scrollToBottomOnThreadSwitch
				className="relative flex flex-1 min-h-0 flex-col overflow-y-auto scroll-smooth px-4 pt-4"
			>
				<div className="sticky top-0 z-10 mb-4">
					<ChatHeader />
				</div>

				<div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col items-center justify-center text-muted-foreground">
					Start a research conversation.
				</div>

				<ThreadPrimitive.Messages
					components={{
						UserMessage,
						EditComposer,
						AssistantMessage,
					}}
				/>

				<ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4">
					<ThreadPrimitive.ScrollToBottom asChild>
						<TooltipIconButton
							tooltip="Scroll to bottom"
							variant="outline"
							className="absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
						>
							<ArrowDownIcon />
						</TooltipIconButton>
					</ThreadPrimitive.ScrollToBottom>
					<Composer />
				</ThreadPrimitive.ViewportFooter>
			</ThreadPrimitive.Viewport>
		</ThreadPrimitive.Root>
	);
}

function Composer() {
	return (
		<ComposerPrimitive.Root className="relative flex w-full flex-col">
			<div className="flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2">
				<ComposerPrimitive.Input
					placeholder="Send a message..."
					className="mb-1 max-h-40 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
					rows={1}
				/>
				<div className="relative mx-2 mb-2 flex items-center justify-end">
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
						>
							<ArrowUpIcon className="size-4" />
						</TooltipIconButton>
					</ComposerPrimitive.Send>
					<ComposerPrimitive.Cancel asChild>
						<Button
							type="button"
							variant="default"
							size="icon"
							className="size-8 rounded-full"
						>
							<SquareIcon className="size-3 fill-current" />
						</Button>
					</ComposerPrimitive.Cancel>
				</div>
			</div>
		</ComposerPrimitive.Root>
	);
}

function UserMessage() {
	return (
		<MessagePrimitive.Root className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-1">
			<div className="relative col-start-2 min-w-0">
				<div className="rounded-2xl bg-muted px-4 py-2.5 break-words text-foreground">
					<MessagePrimitive.Parts />
				</div>
				<div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
					<ActionBarPrimitive.Root
						hideWhenRunning
						autohide="not-last"
						className="flex flex-row items-center gap-1"
					>
						<ActionBarPrimitive.Edit asChild>
							<TooltipIconButton tooltip="Edit" className="p-4">
								<PencilIcon />
							</TooltipIconButton>
						</ActionBarPrimitive.Edit>
					</ActionBarPrimitive.Root>
				</div>
			</div>
		</MessagePrimitive.Root>
	);
}

function EditComposer() {
	return (
		<MessagePrimitive.Root className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-3">
			<ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
				<ComposerPrimitive.Input className="min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none" />
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
	const ToolPart = (props: {
		toolName: string;
		args: unknown;
		result?: unknown;
		status?: { type?: string; reason?: string };
	}) => {
		const isRunning = props.status?.type === "running";
		const isError = props.status?.type === "incomplete";
		return (
			<ToolCallRenderer
				toolName={props.toolName}
				args={props.args}
				result={props.result}
				isRunning={isRunning}
				errored={isError}
				status={isError ? "error" : "success"}
			/>
		);
	};

	return (
		<MessagePrimitive.Root className="relative mx-auto w-full max-w-[var(--thread-max-width)] py-3">
			<div className="break-words px-2 leading-relaxed text-foreground">
				<MessagePrimitive.Parts
					components={{
						tools: {
							by_name: {
								display_image: ToolPart,
								search_knowledge_base: ToolPart,
								analyze_image: ToolPart,
								index_document: ToolPart,
								index_webpage: ToolPart,
								index_youtube: ToolPart,
							},
						},
						Source: Sources,
					}}
				/>
			</div>
			<div className="mt-1 ml-2 flex min-h-6 items-center">
				<ActionBarPrimitive.Root className="-ml-1 flex gap-1 text-muted-foreground">
					<ActionBarPrimitive.Copy asChild>
						<TooltipIconButton tooltip="Copy">
							<CopyIcon />
						</TooltipIconButton>
					</ActionBarPrimitive.Copy>
					<ActionBarPrimitive.ExportMarkdown asChild>
						<TooltipIconButton tooltip="Export as Markdown">
							<DownloadIcon />
						</TooltipIconButton>
					</ActionBarPrimitive.ExportMarkdown>
				</ActionBarPrimitive.Root>
			</div>
		</MessagePrimitive.Root>
	);
}
