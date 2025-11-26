"use client";

import {
	ArrowDown,
	Check,
	Copy,
	Send,
	Square,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChatFurtherQuestions } from "@/components/chat/ChatFurtherQuestions";
import { ChatInputUI } from "@/components/chat/ChatInputGroup";
import ChatSourcesDisplay from "@/components/chat/ChatSources";
import TerminalDisplay from "@/components/chat/ChatTerminal";
import MarkdownWithCode from "@/components/markdownWithCode/MarkdownWithCode";
import { Button } from "@/components/ui/button";
import type { Document } from "@/hooks/use-documents";

interface Message {
	id: string;
	role: "user" | "assistant" | "system" | "data";
	content: string;
	annotations?: unknown[];
}

interface SourceNode {
	id: string;
	text: string;
	url: string;
	metadata: {
		title: string;
		source_type: string;
		group_name: string;
	};
}

// Helper to extract sources from message annotations
function getSourcesFromMessage(message: Message): SourceNode[] {
	if (!message.annotations || !Array.isArray(message.annotations)) {
		return [];
	}

	const allNodes: SourceNode[] = [];

	for (const annotation of message.annotations) {
		if (annotation && typeof annotation === "object") {
			// Handle format: { type: "sources", data: { nodes: [...] } }
			if (
				"type" in annotation &&
				(annotation as { type: string }).type === "sources" &&
				"data" in annotation
			) {
				const data = (annotation as { data: { nodes?: SourceNode[] } }).data;
				if (data.nodes && Array.isArray(data.nodes)) {
					allNodes.push(...data.nodes);
				}
			}
		}
	}

	return allNodes;
}

interface ChatHandler {
	messages: Message[];
	input: string;
	isLoading: boolean;
	handleSubmit: (e: React.FormEvent) => void;
	handleInputChange: (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.ChangeEvent<HTMLInputElement>,
	) => void;
	setInput: (input: string) => void;
	append: (message: {
		role: "user" | "assistant";
		content: string;
	}) => Promise<unknown>;
	reload?: () => void;
	stop?: () => void;
}

interface ChatInterfaceProps {
	handler: ChatHandler;
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
}

// Custom Message Actions Component
function MessageActions({ message }: { message: Message }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		if (message.content) {
			// Remove citations from copied text
			const cleanedContent = message.content
				.replace(/\[citation:\d+\]/g, "")
				.replace(/\[(\d+)\]/g, "");
			await navigator.clipboard.writeText(cleanedContent);
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

// Custom Messages Display Component
function ChatMessages({
	messages,
	isLoading,
	onQuestionClick,
}: {
	messages: Message[];
	isLoading: boolean;
	onQuestionClick?: (question: string) => void;
}) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [isScrolledUp, setIsScrolledUp] = useState(false);
	const [userHasScrolled, setUserHasScrolled] = useState(false);
	const prevMessagesLengthRef = useRef(messages.length);

	// Auto-scroll to bottom when new messages arrive or during streaming
	useEffect(() => {
		if (!userHasScrolled && scrollContainerRef.current) {
			const isNewMessage = messages.length !== prevMessagesLengthRef.current;
			prevMessagesLengthRef.current = messages.length;

			// Scroll smoothly for new messages, instantly during streaming
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: isNewMessage ? "smooth" : "auto",
			});
		}
	}, [messages, userHasScrolled]);

	// Reset userHasScrolled when a new message starts
	useEffect(() => {
		if (isLoading) {
			setUserHasScrolled(false);
		}
	}, [isLoading]);

	useEffect(() => {
		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			const tolerance = 100;
			const isNearBottom = scrollTop + clientHeight >= scrollHeight - tolerance;
			setIsScrolledUp(!isNearBottom);

			// Detect if user manually scrolled up
			if (!isNearBottom && isLoading) {
				setUserHasScrolled(true);
			}
		};

		scrollContainer.addEventListener("scroll", handleScroll);
		handleScroll();

		return () => {
			scrollContainer.removeEventListener("scroll", handleScroll);
		};
	}, [isLoading]);

	const scrollToBottom = () => {
		setUserHasScrolled(false);
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	};

	return (
		<div
			ref={scrollContainerRef}
			className="custom-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto px-4 py-4 relative"
		>
			<div className="flex w-full flex-col">
				{messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
						<p>Start your conversation.</p>
					</div>
				) : (
					messages.map((message, index) => {
						const isLast = index === messages.length - 1;

						return (
							<div
								key={message.id}
								className={twMerge(
									"flex animate-fade-in gap-3 rounded-lg p-3 px-4 mb-4",
									message.role === "user"
										? "max-w-[75%] self-end bg-primary/10"
										: "w-full self-start !px-0 !pb-4 !pt-0",
								)}
							>
								<div className="min-w-0 text-foreground w-full">
									{message.role === "assistant" && (
										<>
											<TerminalDisplay message={message} open={isLast} />
											<ChatSourcesDisplay message={message} />
										</>
									)}
									<MarkdownWithCode
										markdown={message.content}
										isUser={message.role === "user"}
										sources={
											message.role === "assistant"
												? getSourcesFromMessage(message)
												: undefined
										}
									/>
									{message.role === "assistant" && (
										<>
											<ChatFurtherQuestions
												message={message}
												onQuestionClick={onQuestionClick}
											/>
											<div className="flex justify-end mt-2">
												<MessageActions message={message} />
											</div>
										</>
									)}
								</div>
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Scroll to bottom button */}
			{isScrolledUp && (
				<div className="sticky bottom-4 left-1/2 -translate-x-1/2 flex justify-center">
					<button
						className="flex cursor-pointer items-center justify-center rounded-full border border-border bg-background p-2 hover:bg-accent transition-colors shadow-lg"
						onClick={scrollToBottom}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								scrollToBottom();
							}
						}}
						aria-label="Scroll to bottom"
					>
						<ArrowDown className="h-5 w-5" />
					</button>
				</div>
			)}
		</div>
	);
}

// Custom Chat Input Component
function ChatInput({ handler }: { handler: ChatHandler }) {
	const handleSend = useCallback(() => {
		const message = handler.input.trim();
		if (!message || handler.isLoading) return;

		// Use append to send the message (handles both new and existing chats)
		handler.append({ role: "user", content: message });
		handler.setInput("");
	}, [handler]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleStop = useCallback(() => {
		handler.stop?.();
	}, [handler]);

	return (
		<div className="flex items-center gap-2">
			<textarea
				value={handler.input}
				onChange={handler.handleInputChange}
				onKeyDown={handleKeyDown}
				placeholder="Type your message..."
				rows={1}
				className="flex-1 min-h-[48px] resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
			/>
			{handler.isLoading ? (
				<button
					className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-none bg-destructive text-destructive-foreground transition-opacity hover:opacity-90"
					onClick={handleStop}
					title="Stop"
				>
					<Square className="h-5 w-5" fill="currentColor" />
				</button>
			) : (
				<button
					className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-none bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					onClick={handleSend}
					disabled={handler.input.trim() === ""}
					title="Send"
				>
					<Send className="h-5 w-5" />
				</button>
			)}
		</div>
	);
}

export default function ChatInterface({
	handler,
	onDocumentSelectionChange,
	selectedDocuments = [],
	onConnectorSelectionChange,
	selectedConnectors = [],
	searchMode,
	onSearchModeChange,
}: ChatInterfaceProps) {
	const handleQuestionClick = useCallback(
		(question: string) => {
			// Send the question as a new user message
			handler.append({ role: "user", content: question });
		},
		[handler],
	);

	return (
		<div className="flex h-[calc(100dvh-4rem)] flex-col">
			<ChatMessages
				messages={handler.messages}
				isLoading={handler.isLoading}
				onQuestionClick={handleQuestionClick}
			/>
			<div className="shrink-0 border-t p-4">
				<div className="space-y-3">
					<ChatInputUI
						onDocumentSelectionChange={onDocumentSelectionChange}
						selectedDocuments={selectedDocuments}
						onConnectorSelectionChange={onConnectorSelectionChange}
						selectedConnectors={selectedConnectors}
						searchMode={searchMode}
						onSearchModeChange={onSearchModeChange}
					/>
					<ChatInput handler={handler} />
				</div>
			</div>
		</div>
	);
}
