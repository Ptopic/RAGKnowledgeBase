import type { Message } from "@langchain/core/messages";
import { PencilIcon, User } from "lucide-react";
import type { FC } from "react";
import MarkdownWithCode from "@/components/markdownWithCode/MarkdownWithCode";
import { TooltipIconButton } from "./tooltip-icon-button";

interface UserMessageProps {
	message: Message;
	onEdit?: (message: Message) => void;
}

export const UserMessage: FC<UserMessageProps> = ({ message, onEdit }) => {
	const content =
		typeof message.content === "string"
			? message.content
			: JSON.stringify(message.content);

	return (
		<div
			className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
			data-role="user"
		>
			<div className="aui-user-message-content-wrapper col-start-2 min-w-0 flex items-end gap-2">
				<div className="flex-1 min-w-0">
					<div className="relative">
						<div className="aui-user-message-content wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
							<MarkdownWithCode markdown={content} isUser />
						</div>
						<div className="aui-user-action-bar-wrapper absolute top-1/2 right-full -translate-y-1/2 pr-1">
							<TooltipIconButton
								tooltip="Edit"
								className="aui-user-action-edit p-4"
								onClick={() => onEdit?.(message)}
							>
								<PencilIcon />
							</TooltipIconButton>
						</div>
					</div>
				</div>
				<div className="shrink-0 mb-1.5">
					<div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
						<User className="size-4" />
					</div>
				</div>
			</div>
		</div>
	);
};
