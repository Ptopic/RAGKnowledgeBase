"use client";

import { FileText, Paperclip, PlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { type FC, useMemo, useRef } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { getChatAcceptString } from "@/lib/accepted-file-types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ChatAttachment {
	id: string;
	name: string;
	type: "image" | "file";
	file: File;
	previewUrl?: string;
}

interface ComposerAddAttachmentProps {
	onAdd: (attachments: ChatAttachment[]) => void;
}

export const ComposerAddAttachment: FC<ComposerAddAttachmentProps> = ({ onAdd }) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handlePick = () => {
		fileInputRef.current?.click();
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		const mapped: ChatAttachment[] = files.map((file) => {
		const isImage = file.type.startsWith("image/");
		return {
			id: `${Date.now()}_${file.name}`,
			name: file.name,
			type: isImage ? "image" : "file",
			file,
			previewUrl: isImage ? URL.createObjectURL(file) : undefined,
		};
		});

		onAdd(mapped);
		e.currentTarget.value = "";
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<TooltipIconButton
						tooltip="Upload"
						side="bottom"
						variant="ghost"
						size="icon"
						className="size-[34px] rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15"
					>
						<PlusIcon className="size-5 stroke-[1.5px]" />
					</TooltipIconButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-48 bg-background border-border">
					<DropdownMenuItem onSelect={handlePick} className="cursor-pointer">
						<Paperclip className="size-4" />
						<span>Add attachment</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				accept={getChatAcceptString()}
				onChange={handleChange}
			/>
		</>
	);
};

interface ComposerAttachmentsProps {
	attachments: ChatAttachment[];
	onRemove: (id: string) => void;
}

export const ComposerAttachments: FC<ComposerAttachmentsProps> = ({ attachments, onRemove }) => {
	if (attachments.length === 0) return null;

	return (
		<div className="mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1">
			{attachments.map((att) => (
				<div key={att.id} className="relative">
					<div className="size-14 overflow-hidden rounded-[14px] border bg-muted">
						{att.type === "image" && att.previewUrl ? (
							<Image
								src={att.previewUrl}
								alt={att.name}
								width={56}
								height={56}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<FileText className="size-6 text-muted-foreground" />
							</div>
						)}
					</div>
					<TooltipIconButton
						tooltip="Remove file"
						className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white!"
						side="top"
						onClick={() => onRemove(att.id)}
					>
						<XIcon className="size-3" />
					</TooltipIconButton>
				</div>
			))}
		</div>
	);
};

interface UserMessageAttachmentsProps {
	attachments: ChatAttachment[];
}

export const UserMessageAttachments: FC<UserMessageAttachmentsProps> = ({ attachments }) => {
	const printable = useMemo(() => attachments.filter((a) => a.type !== "image"), [attachments]);
	if (attachments.length === 0) return null;

	return (
		<div className="flex flex-wrap items-end gap-2 mb-2 justify-end">
			{attachments
				.filter((att) => att.type === "image" && att.previewUrl)
				.map((att) => (
					<div
						key={att.id}
						className="relative overflow-hidden rounded-xl border border-border/50 bg-muted"
					>
						<Image
							src={att.previewUrl || ""}
							alt={att.name}
							width={120}
							height={90}
							className="object-cover w-[120px] h-[90px]"
						/>
					</div>
				))}
			{printable.map((att) => (
				<span
					key={att.id}
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20"
					title={att.name}
				>
					<FileText className="size-3" />
					<span className="max-w-[150px] truncate">{att.name}</span>
				</span>
			))}
		</div>
	);
};
