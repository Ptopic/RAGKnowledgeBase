"use client";

import { type FC, useState } from "react";
import { SourceDetailSheet } from "@/components/chat/SourceDetailSheet";

interface InlineCitationProps {
	chunkId: number;
	citationNumber: number;
	isDocsChunk?: boolean;
}

export const InlineCitation: FC<InlineCitationProps> = ({
	chunkId,
	citationNumber,
	isDocsChunk = false,
}) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<SourceDetailSheet
			open={isOpen}
			onOpenChange={setIsOpen}
			chunkId={chunkId}
			sourceType={isDocsChunk ? "SURFSENSE_DOCS" : "FILE"}
			title={isDocsChunk ? "Surfsense Documentation" : "Source"}
			description=""
			url=""
		>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="text-[10px] font-bold bg-primary/80 hover:bg-primary text-primary-foreground rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center align-super cursor-pointer transition-colors ml-0.5"
				title={`View source #${citationNumber}`}
			>
				{citationNumber}
			</button>
		</SourceDetailSheet>
	);
};
