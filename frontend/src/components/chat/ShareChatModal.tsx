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
	const [copied, setCopied] = useState(false);
	const [createdLink, setCreatedLink] = useState<string | null>(null);

	const { data: shareLinks = [] } =
		useGetChatShareLinks(open ? chatId : undefined);
	const { mutateAsync: createShareLink, isPending: isCreating } =
		useCreateShareLink({
			onSuccess: (data) => {
				const fullUrl = `${window.location.origin}${data.url}`;
				setCreatedLink(fullUrl);
			},
		});
	const { mutate: deactivateLink } = useDeactivateShareLink();

	// Reset state when modal opens
	useEffect(() => {
		if (open) {
			setCreatedLink(null);
			setExpirationDays("never");
			setCopied(false);
		}
	}, [open]);

	const handleCreateLink = async () => {
		const expiresInDays =
			expirationDays === "never" ? undefined : Number(expirationDays);
		await createShareLink({ chatId, data: { expiresInDays } });
	};

	const handleCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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

				{!createdLink ? (
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
						<Button
							onClick={handleCreateLink}
							disabled={isCreating}
							className="w-full"
						>
							{isCreating ? "Creating..." : "Create Share Link"}
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
								{createdLink}
							</code>
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleCopy(createdLink)}
							>
								{copied ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
							</Button>
						</div>

						{shareLinks.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Active Share Links</h4>
								{shareLinks
									.filter((link) => link.isActive)
									.map((link) => {
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
													<Copy className="h-3.5 w-3.5" />
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
						)}

						<Button
							variant="outline"
							onClick={() => setCreatedLink(null)}
							className="w-full"
						>
							Create Another Link
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
