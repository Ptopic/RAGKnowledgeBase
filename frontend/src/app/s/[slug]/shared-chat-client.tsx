"use client";

import { AlertCircle, Clock, LinkIcon, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import useGetSharedChat from "@/api/chats/share/hooks/useGetSharedChat";
import MarkdownWithCode from "@/components/markdownWithCode/MarkdownWithCode";

interface SharedChatClientProps {
	slug: string;
}

export default function SharedChatClient({ slug }: SharedChatClientProps) {
	const { data: chat, isLoading, error } = useGetSharedChat(slug);

	const [errorCode, setErrorCode] = useState<number | null>(null);

	useEffect(() => {
		if (error) {
			const message = error.message.toLowerCase();
			if (message.includes("expired") || message.includes("410")) {
				setErrorCode(410);
			} else {
				setErrorCode(404);
			}
		}
	}, [error]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-2">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
					<p className="text-sm text-muted-foreground">Loading shared chat...</p>
				</div>
			</div>
		);
	}

	if (errorCode === 410) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<Clock className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold">Link Expired</h1>
					<p className="text-muted-foreground">
						This share link has expired and is no longer accessible.
					</p>
				</div>
			</div>
		);
	}

	if (errorCode || !chat) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<AlertCircle className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold">Link Not Found</h1>
					<p className="text-muted-foreground">
						This share link doesn&apos;t exist or has been deactivated.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-14 items-center px-4">
					<div className="flex items-center gap-2">
						<LinkIcon className="h-5 w-5 text-muted-foreground" />
						<h1 className="text-lg font-semibold">{chat.title}</h1>
					</div>
					<div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
						<Share2 className="h-4 w-4" />
						<span>Shared conversation</span>
					</div>
				</div>
			</div>

			<div className="container mx-auto max-w-3xl px-4 py-8">
				<div className="space-y-6">
					{chat.messages.map((msg: any, index: number) => {
						const isUser = msg.role === "user";
						const content =
							typeof msg.content === "string"
								? msg.content
								: JSON.stringify(msg.content);
						const msgKey = msg.id ? `shared-msg-${msg.id}` : `shared-msg-${chat.id}-${index}`;

						return (
							<div
								key={msgKey}
								className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
							>
								<div
									className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
										isUser ? "bg-muted" : "bg-primary"
									}`}
								>
									<span className={`text-xs font-medium ${isUser ? "text-muted-foreground" : "text-primary-foreground"}`}>
										{isUser ? "U" : "AI"}
									</span>
								</div>
								<div
									className={`flex-1 space-y-2 ${isUser ? "flex flex-col items-end" : ""}`}
								>
									<div
										className={`rounded-lg px-4 py-3 ${
											isUser
												? "bg-primary text-primary-foreground max-w-[80%]"
												: "bg-muted/50"
										}`}
									>
										<MarkdownWithCode
											markdown={content}
											isUser={isUser}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
					<p>This is a read-only shared conversation.</p>
				</div>
			</div>
		</div>
	);
}
