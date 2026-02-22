"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { type FC, type ReactNode, memo, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/chat/CodeBlock";
import { InlineCitation } from "@/components/assistant-ui/inline-citation";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const CITATION_REGEX = /[[【]\u200B?citation:(doc-)?(\d+)\u200B?[\]】]/g;

let citationMap = new Map<string, number>();
let citationCounter = 1;

function resetCitations() {
	citationMap = new Map();
	citationCounter = 1;
}

function getCitationNumber(chunkId: number, isDocsChunk: boolean): number {
	const key = isDocsChunk ? `doc-${chunkId}` : String(chunkId);
	const existing = citationMap.get(key);
	if (existing !== undefined) return existing;
	citationMap.set(key, citationCounter++);
	return citationCounter - 1;
}

function processTextWithCitations(text: string): ReactNode[] {
	const parts: ReactNode[] = [];
	let lastIndex = 0;
	let instanceIndex = 0;

	CITATION_REGEX.lastIndex = 0;
	let match = CITATION_REGEX.exec(text);

	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(text.substring(lastIndex, match.index));
		}

		const isDocsChunk = match[1] === "doc-";
		const chunkId = Number.parseInt(match[2], 10);
		const citationNumber = getCitationNumber(chunkId, isDocsChunk);
		parts.push(
			<InlineCitation
				key={`citation-${isDocsChunk ? "doc-" : ""}${chunkId}-${instanceIndex}`}
				chunkId={chunkId}
				citationNumber={citationNumber}
				isDocsChunk={isDocsChunk}
			/>,
		);

		lastIndex = match.index + match[0].length;
		instanceIndex++;
		match = CITATION_REGEX.exec(text);
	}

	if (lastIndex < text.length) {
		parts.push(text.substring(lastIndex));
	}

	return parts.length > 0 ? parts : [text];
}

function processChildrenWithCitations(children: ReactNode): ReactNode {
	if (typeof children === "string") {
		const parsed = processTextWithCitations(children);
		return parsed.length === 1 && typeof parsed[0] === "string" ? children : <>{parsed}</>;
	}

	if (Array.isArray(children)) {
		return children.map((child, idx) => {
			if (typeof child === "string") {
				const parsed = processTextWithCitations(child);
				return parsed.length === 1 && typeof parsed[0] === "string" ? (
					child
				) : (
					<span key={`citation-child-${idx}-${child.slice(0, 20)}`}>{parsed}</span>
				);
			}
			return child;
		});
	}

	return children;
}

interface MarkdownTextProps {
	text: string;
	className?: string;
}

const CodeHeader: FC<{ language?: string; code: string }> = ({ language, code }) => {
	const [copied, setCopied] = useState(false);

	const onCopy = async () => {
		if (!code || copied) return;
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 3000);
	};

	return (
		<div className="mt-4 flex items-center justify-between gap-4 rounded-t-lg bg-muted-foreground/15 px-4 py-2 font-semibold text-foreground text-sm dark:bg-muted-foreground/20">
			<span className="lowercase [&>span]:text-xs">{language}</span>
			<TooltipIconButton tooltip="Copy" onClick={onCopy}>
				{!copied && <CopyIcon />}
				{copied && <CheckIcon />}
			</TooltipIconButton>
		</div>
	);
};

const MarkdownText: FC<MarkdownTextProps> = memo(({ text, className }) => {
	useMemo(() => {
		resetCitations();
	}, []);

	const content = text || "";

	return (
		<div className={cn("aui-md", className)}>
			<Streamdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[]}
				components={{
					h1: ({ className: c, children, ...props }) => (
						<h1 className={cn("mb-8 scroll-m-20 font-extrabold text-4xl tracking-tight last:mb-0", c)} {...props}>
							{processChildrenWithCitations(children)}
						</h1>
					),
					h2: ({ className: c, children, ...props }) => (
						<h2 className={cn("mt-8 mb-4 scroll-m-20 font-semibold text-3xl tracking-tight first:mt-0 last:mb-0", c)} {...props}>
							{processChildrenWithCitations(children)}
						</h2>
					),
					p: ({ className: c, children, ...props }) => (
						<p className={cn("mt-5 mb-5 leading-7 first:mt-0 last:mb-0", c)} {...props}>
							{processChildrenWithCitations(children)}
						</p>
					),
					a: ({ className: c, children, ...props }) => (
						<a className={cn("font-medium text-primary underline underline-offset-4", c)} {...props}>
							{processChildrenWithCitations(children)}
						</a>
					),
					ul: ({ className: c, ...props }) => (
						<ul className={cn("my-5 ml-6 list-disc [&>li]:mt-2", c)} {...props} />
					),
					ol: ({ className: c, ...props }) => (
						<ol className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", c)} {...props} />
					),
					li: ({ className: c, children, ...props }) => (
						<li className={cn("", c)} {...props}>
							{processChildrenWithCitations(children)}
						</li>
					),
					pre: ({ className: c, ...props }) => (
						<pre className={cn("overflow-x-auto rounded-t-none! rounded-b-lg bg-black p-4 text-white", c)} {...props} />
					),
					code: ({ className: c, children, ...props }) => {
						const match = /language-(\w+)/.exec(c || "");
						if (!match) {
							return (
								<code className={cn("rounded border bg-muted px-1 py-0.5 font-semibold", c)} {...props}>
									{children}
								</code>
							);
						}

						const language = match[1];
						const code = String(children).replace(/\n$/, "");
						return (
							<>
								<CodeHeader language={language} code={code} />
								<CodeBlock language={language}>{code}</CodeBlock>
							</>
						);
					},
				}}
			>
				{content}
			</Streamdown>
		</div>
	);
});

MarkdownText.displayName = "MarkdownText";

export { MarkdownText };
