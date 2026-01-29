"use client";

import { type Message, useChatUI } from "@llamaindex/chat-ui";
import { Bot, Check, Copy, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedEmptyState } from "@/components/chat/AnimatedEmptyState";
import { ChatFurtherQuestions } from "@/components/chat/ChatFurtherQuestions";
import ChatSourcesDisplay from "@/components/chat/ChatSources";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarkdownWithCode from "../markdownWithCode/MarkdownWithCode";

/**
 * Remove citation markers from text
 * Removes patterns like [citation:123] or [123]
 */
function removeCitations(text: string): string {
	// Remove [citation:id] format
	let cleaned = text.replace(/\[citation:\d+\]/g, "");
	// Remove [id] format (numbered citations)
	cleaned = cleaned.replace(/\[(\d+)\]/g, "");
	return cleaned;
}

function removeAllMarkdownElements(text: string): string {
	let result = text;

	// Remove code blocks (```language ... ```)
	result = result.replace(/```[\s\S]*?```/g, "");

	// Remove inline code (`code`)
	result = result.replace(/`([^`]+)`/g, "$1");

	// Remove images ![alt](url)
	result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

	// Remove links [text](url) - keep the text
	result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

	// Remove headers (# ## ### etc.) at start of line
	result = result.replace(/^#{1,6}\s+/gm, "");

	// Remove bold **text** or __text__ (lazy matching)
	result = result.replace(/\*\*(.+?)\*\*/g, "$1");
	result = result.replace(/__(.+?)__/g, "$1");

	// Remove italic *text* or _text_ (lazy matching)
	result = result.replace(/\*(.+?)\*/g, "$1");
	result = result.replace(/\b_(.+?)_\b/g, "$1");

	// Remove strikethrough ~~text~~
	result = result.replace(/~~(.+?)~~/g, "$1");

	// Remove blockquotes (> at start of line)
	result = result.replace(/^>\s*/gm, "");

	// Remove horizontal rules (---, ***, ___) - must be done BEFORE list markers
	result = result.replace(/^[-*_]{3,}\s*$/gm, "");

	// Remove unordered list markers (-, *, +) at start of line
	result = result.replace(/^\s*[-*+]\s+/gm, "");

	// Remove ordered list markers (1., 2., 3., etc.) at start of line
	result = result.replace(/^\s*\d+\.\s+/gm, "");

	// Remove markdown line breaks (two trailing spaces)
	result = result.replace(/ {2}$/gm, "");

	// Remove extra blank lines
	result = result.replace(/\n{3,}/g, "\n\n");

	return result.trim();
}
/**
 * Custom Actions component with citation-free copy
 */
function CustomMessageActions({ message }: { message: Message }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		if (message.content) {
			const cleanedContent = removeCitations(message.content);
			const contentWithoutMarkdown = removeAllMarkdownElements(cleanedContent);
			await navigator.clipboard.writeText(contentWithoutMarkdown);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}, [message.content]);

	return (
		<div className="flex gap-1">
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={handleCopy}
				title="Copy response"
			>
				{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				title="Good response"
			>
				<ThumbsUp className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				title="Bad response"
			>
				<ThumbsDown className="h-4 w-4" />
			</Button>
		</div>
	);
}

export function ChatMessagesUI() {
	const { messages, isLoading } = useChatUI();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		<div className="flex-1 flex flex-col overflow-y-auto">
			{messages.length === 0 ? (
				<div className="flex-1 flex items-center justify-center">
					<AnimatedEmptyState />
				</div>
			) : (
				<div className="p-4 space-y-6">
					{messages.map((message, index) => (
						<ChatMessageUI
							key={`Message-${index}`}
							message={message}
							isLast={index === messages.length - 1}
						/>
					))}
					<div ref={messagesEndRef} />
				</div>
			)}
		</div>
	);
}

function ChatMessageUI({
	message,
	isLast,
}: {
	message: Message;
	isLast: boolean;
}) {
	const isUser = message.role === "user";
	const isAssistant = message.role === "assistant";

	return (
		<div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
			{/* Avatar */}
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
					isUser ? "bg-muted" : "bg-primary",
				)}
			>
				{isUser ? (
					<User className="h-5 w-5 text-muted-foreground" />
				) : (
					<Bot className="h-5 w-5 text-primary-foreground" />
				)}
			</div>

			{/* Message Content */}
			<div
				className={cn("flex-1 space-y-4", isUser && "flex flex-col items-end")}
			>
				{isAssistant && <ChatSourcesDisplay message={message} />}

				<div
					className={cn(
						"rounded-lg px-4 py-3",
						isUser
							? "bg-primary text-primary-foreground max-w-[80%]"
							: "bg-muted/50",
					)}
				>
					<MarkdownWithCode
						markdown={message.content}
						isUser={isUser}
						isStreaming={isLast && !message.content}
					/>
				</div>

				{isAssistant && (
					<div className="flex flex-row justify-end gap-2">
						{isLast && <ChatFurtherQuestions message={message} />}
						<CustomMessageActions message={message} />
					</div>
				)}
			</div>
		</div>
	);
}
