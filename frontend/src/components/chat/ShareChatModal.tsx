"use client";

import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import useCreateShareLink from "@/api/chats/share/hooks/useCreateShareLink";
import useDeactivateShareLink from "@/api/chats/share/hooks/useDeactivateShareLink";
import useGetChatShareLinks from "@/api/chats/share/hooks/useGetChatShareLinks";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ShareChatModalProps {
	chatId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function ShareChatModal({
	chatId,
	open,
	onOpenChange,
}: ShareChatModalProps) {
	const [expirationDays, setExpirationDays] = useState<string>("never");
	const [copied, setCopied] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);

	const { data: shareLinks = [] } =
		useGetChatShareLinks(open ? chatId : undefined);
	const { mutateAsync: createShareLink, isPending: isCreating } =
		useCreateShareLink({
			onSuccess: () => {
				setShowCreateForm(false);
			},
		});
	const { mutate: deactivateLink } = useDeactivateShareLink();

	const activeLinks = shareLinks.filter((link) => link.isActive);

	useEffect(() => {
		if (open) {
			setShowCreateForm(false);
			setExpirationDays("never");
			setCopied(null);
		}
	}, [open]);

	const handleCreateLink = async () => {
		const expiresInDays =
			expirationDays === "never" ? undefined : Number(expirationDays);
		await createShareLink({ chatId, data: { expiresInDays } });
	};

	const handleCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(text);
		setTimeout(() => setCopied(null), 2000);
	};

	const handleRevoke = (linkId: string) => {
		deactivateLink({ chatId, linkId });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						<span>Share Chat</span>
					</DialogTitle>
					<DialogDescription>
						Create a read-only link to share this conversation.
					</DialogDescription>
				</DialogHeader>

				{showCreateForm ? (
					<div className="space-y-4">
						<div className="space-y-2">
							<span className="text-sm font-medium">Link Expiration</span>
							<Select
								value={expirationDays}
								onValueChange={setExpirationDays}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select expiration" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="never">Never</SelectItem>
										<SelectItem value="1">1 Day</SelectItem>
										<SelectItem value="7">7 Days</SelectItem>
										<SelectItem value="30">30 Days</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setShowCreateForm(false)}
								className="flex-1"
							>
								Back
							</Button>
							<Button
								onClick={handleCreateLink}
								disabled={isCreating}
								className="flex-1"
							>
								{isCreating ? "Creating..." : "Create Share Link"}
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{activeLinks.length > 0 ? (
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Active Share Links</h4>
								{activeLinks.map((link) => {
									const linkUrl = `${window.location.origin}${link.url}`;
									return (
										<div
											key={link.id}
											className="flex items-center justify-between gap-2 rounded border p-2"
										>
											<div className="flex-1 min-w-0">
												<code className="text-xs break-all">
													{linkUrl}
												</code>
												{link.expiresAt && (
													<p className="text-xs text-muted-foreground mt-1">
														Expires:{" "}
														{format(
															new Date(link.expiresAt),
															"MMM d, yyyy",
														)}
													</p>
												)}
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="shrink-0"
												onClick={() => handleCopy(linkUrl)}
											>
												{copied === linkUrl ? (
													<Check className="h-3.5 w-3.5" />
												) : (
													<Copy className="h-3.5 w-3.5" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="shrink-0 text-destructive"
												onClick={() => handleRevoke(link.id)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No active share links for this chat.
							</p>
						)}

						<Button
							onClick={() => setShowCreateForm(true)}
							className="w-full"
						>
							Create New Link
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
