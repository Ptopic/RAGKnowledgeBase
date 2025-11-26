import { Fragment, memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { twMerge } from "tailwind-merge";
import { SourceDetailSheet } from "@/components/chat/SourceDetailSheet";

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

interface MarkdownWithCodeProps {
	markdown: string;
	isStreaming?: boolean;
	isUser?: boolean;
	sources?: SourceNode[];
}

// Inline citation component with click-to-open functionality
const InlineCitation = memo(
	({ id, source }: { id: string; source?: SourceNode }) => {
		const [isOpen, setIsOpen] = useState(false);

		if (!source) {
			return (
				<span className="inline-flex items-baseline">
					<span className="text-muted-foreground/60 text-[9px] font-medium align-super">
						[{id}]
					</span>
				</span>
			);
		}

		return (
			<>
				<span
					className="inline-flex items-center justify-center cursor-pointer ml-0.5 align-super group"
					onClick={() => setIsOpen(true)}
					title={`${source.metadata.title}`}
				>
					<span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-md bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-sm transition-all duration-200 group-hover:from-primary/30 group-hover:to-primary/20 group-hover:border-primary/50 group-hover:shadow-md group-hover:scale-105">
						{id}
					</span>
				</span>
				<SourceDetailSheet
					open={isOpen}
					onOpenChange={setIsOpen}
					chunkId={Number(id)}
					sourceType={source.metadata.source_type}
					title={source.metadata.title}
					description={source.text}
					url={source.url}
				/>
			</>
		);
	},
);

InlineCitation.displayName = "InlineCitation";

// Process text to render citations
const processCitations = (
	text: string,
	sources: SourceNode[] = [],
): (string | JSX.Element)[] => {
	const citationRegex = /\[(?:citation:)?(\d+)\]/g;
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let position = 0;

	// Find all matches
	const matches = Array.from(text.matchAll(citationRegex));

	for (const match of matches) {
		// Add text before the citation
		if (match.index !== undefined && match.index > lastIndex) {
			parts.push(text.substring(lastIndex, match.index));
		}

		// Find source for this citation
		const citationId = match[1];
		const source = sources.find((s) => s.id === citationId);

		parts.push(
			<InlineCitation
				key={`citation-${citationId}-${position}`}
				id={citationId}
				source={source}
			/>,
		);

		if (match.index !== undefined) {
			lastIndex = match.index + match[0].length;
		}
		position++;
	}

	// Add remaining text
	if (lastIndex < text.length) {
		parts.push(text.substring(lastIndex));
	}

	return parts.length > 0 ? parts : [text];
};

const MarkdownWithCode = memo(
	({
		markdown,
		isStreaming = false,
		isUser = false,
		sources = [],
	}: MarkdownWithCodeProps) => {
		// Process markdown to replace citations before rendering
		const processedContent = useMemo(() => {
			if (!markdown.trim()) return "";
			return markdown;
		}, [markdown]);

		const processedMarkdown = useMemo(() => {
			if (!processedContent) return null;

			return (
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						h1: ({ children, ...props }) => (
							<h1
								className="mb-4 mt-6 text-2xl font-bold text-white"
								{...props}
							>
								{children}
							</h1>
						),
						h2: ({ children, ...props }) => (
							<h2 className="mb-3 mt-5 text-xl font-bold text-white" {...props}>
								{children}
							</h2>
						),
						h3: ({ children, ...props }) => (
							<h3 className="mb-2 mt-4 text-lg font-bold text-white" {...props}>
								{children}
							</h3>
						),
						h4: ({ children, ...props }) => (
							<h4
								className="mb-2 mt-3 text-base font-bold text-white"
								{...props}
							>
								{children}
							</h4>
						),
						h5: ({ children, ...props }) => (
							<h5 className="mb-2 mt-3 text-sm font-bold text-white" {...props}>
								{children}
							</h5>
						),
						h6: ({ children, ...props }) => (
							<h6 className="mb-2 mt-3 text-xs font-bold text-white" {...props}>
								{children}
							</h6>
						),
						p: ({ children, ...props }) => {
							// Process children to handle citations
							const processedChildren = Array.isArray(children)
								? children.map((child, idx) =>
										typeof child === "string" ? (
											<Fragment key={`p-text-${idx}-${child.substring(0, 20)}`}>
												{processCitations(child, sources)}
											</Fragment>
										) : (
											child
										),
									)
								: typeof children === "string"
									? processCitations(children, sources)
									: children;

							return (
								<p
									className={twMerge("mb-4 leading-relaxed", isUser && "mb-0!")}
									{...props}
								>
									{processedChildren}
								</p>
							);
						},
						ul: ({ children, ...props }) => (
							<ul className="mb-4 ml-6 list-disc space-y-1" {...props}>
								{children}
							</ul>
						),
						ol: ({ children, ...props }) => (
							<ol className="mb-4 ml-6 list-decimal space-y-1" {...props}>
								{children}
							</ol>
						),
						li: ({ children, ...props }) => {
							const processedChildren = Array.isArray(children)
								? children.map((child, idx) =>
										typeof child === "string" ? (
											<Fragment
												key={`li-text-${idx}-${child.substring(0, 20)}`}
											>
												{processCitations(child, sources)}
											</Fragment>
										) : (
											child
										),
									)
								: typeof children === "string"
									? processCitations(children, sources)
									: children;

							return (
								<li className="leading-relaxed" {...props}>
									{processedChildren}
								</li>
							);
						},
						a: ({ children, ...props }) => (
							<a
								className="text-blue-400 underline hover:text-blue-300"
								{...props}
							>
								{children}
							</a>
						),
						strong: ({ children, ...props }) => (
							<strong className="font-bold" {...props}>
								{children}
							</strong>
						),
						em: ({ children, ...props }) => (
							<em className="italic" {...props}>
								{children}
							</em>
						),
						hr: ({ ...props }) => (
							<hr className="my-6 border-t border-border" {...props} />
						),
						table: ({ children, ...props }) => (
							<div className="my-4 overflow-x-auto">
								<table
									className="min-w-full border-collapse border border-border text-sm"
									{...props}
								>
									{children}
								</table>
							</div>
						),
						thead: ({ children, ...props }) => (
							<thead className="bg-surface" {...props}>
								{children}
							</thead>
						),
						tbody: ({ children, ...props }) => (
							<tbody {...props}>{children}</tbody>
						),
						tr: ({ children, ...props }) => (
							<tr
								className="border-b border-border hover:bg-surface/50"
								{...props}
							>
								{children}
							</tr>
						),
						th: ({ children, ...props }) => (
							<th
								className="border border-border px-4 py-2 text-left font-bold text-white"
								{...props}
							>
								{children}
							</th>
						),
						td: ({ children, ...props }) => (
							<td className="border border-border px-4 py-2" {...props}>
								{children}
							</td>
						),
						code(props: any) {
							const { node, inline, className, children, ...rest } = props;
							const match = /language-(\w+)/.exec(className || "");
							return !inline && match ? (
								<div className="my-4 w-full overflow-hidden rounded border border-gray-700">
									<div className="overflow-x-auto">
										<SyntaxHighlighter
											style={oneDark as any}
											language={match[1]}
											PreTag="div"
											className="!m-0 !bg-transparent text-sm"
											customStyle={{
												margin: 0,
												padding: "12px",
												background: "transparent",
												whiteSpace: "pre",
												minWidth: "max-content",
											}}
											codeTagProps={{
												style: { background: "transparent" },
											}}
											{...rest}
										>
											{children}
										</SyntaxHighlighter>
									</div>
								</div>
							) : (
								<code
									className={twMerge(
										className,
										"rounded-lg border border-gray-600 py-2 font-mono text-sm",
									)}
									{...rest}
								>
									{children}
								</code>
							);
						},
					}}
				>
					{processedContent}
				</ReactMarkdown>
			);
		}, [processedContent, isUser, sources]);

		return (
			<div className="max-w-none">
				{processedMarkdown}
				{isStreaming && (
					<span className="ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-primary" />
				)}
			</div>
		);
	},
);

MarkdownWithCode.displayName = "MarkdownWithCode";

export default MarkdownWithCode;
