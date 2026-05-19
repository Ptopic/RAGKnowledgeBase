import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { type ComponentPropsWithoutRef, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PProps = ComponentPropsWithoutRef<"p">;
type AProps = ComponentPropsWithoutRef<"a">;
type LiProps = ComponentPropsWithoutRef<"li">;
type UlProps = ComponentPropsWithoutRef<"ul">;
type OlProps = ComponentPropsWithoutRef<"ol">;
type HProps = ComponentPropsWithoutRef<"h1">;
type BlockquoteProps = ComponentPropsWithoutRef<"blockquote">;
type HrProps = ComponentPropsWithoutRef<"hr">;
type ImgProps = ComponentPropsWithoutRef<"img">;
type TableProps = ComponentPropsWithoutRef<"table">;
type ThProps = ComponentPropsWithoutRef<"th">;
type TdProps = ComponentPropsWithoutRef<"td">;
type CodeProps = ComponentPropsWithoutRef<"code"> & { className?: string };

interface MarkdownViewerProps {
	content: string;
	className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
	const components = useMemo(
		() => ({
			p: ({ children, ...props }: PProps) => (
				<p className="py-[3px]" {...props}>{children}</p>
			),
			a: ({ children, ...props }: AProps) => (
				<a className="text-primary hover:underline" {...props}>{children}</a>
			),
			li: ({ children, ...props }: LiProps) => (
				<li className="py-[3px] pl-1" {...props}>{children}</li>
			),
			ul: ({ children, ...props }: UlProps) => (
				<ul className="list-disc pl-6" {...props}>{children}</ul>
			),
			ol: ({ children, ...props }: OlProps) => (
				<ol className="list-decimal pl-6" {...props}>{children}</ol>
			),
			h1: ({ children, ...props }: HProps) => (
				<h1 className="text-3em font-bold pt-[18px]" {...props}>{children}</h1>
			),
			h2: ({ children, ...props }: HProps) => (
				<h2 className="text-2em font-bold pt-[18px]" {...props}>{children}</h2>
			),
			h3: ({ children, ...props }: HProps) => (
				<h3 className="text-1_3em font-bold pt-[18px]" {...props}>{children}</h3>
			),
			h4: ({ children, ...props }: HProps) => (
				<h4 className="text-1em font-bold pt-[18px]" {...props}>{children}</h4>
			),
			h5: ({ children, ...props }: HProps) => (
				<h5 className="text-0_9em font-bold pt-[18px]" {...props}>{children}</h5>
			),
			h6: ({ children, ...props }: HProps) => (
				<h6 className="text-0_8em font-bold pt-[18px]" {...props}>{children}</h6>
			),
			blockquote: ({ children, ...props }: BlockquoteProps) => (
				<blockquote className="border-l-2 border-muted-foreground text-muted-foreground pl-4 italic" {...props}>{children}</blockquote>
			),
			hr: ({ ...props }: HrProps) => (
				<hr className="border-none border-t border-muted-foreground my-2" {...props} />
			),
			img: ({ alt, src, width, height, className, ...rest }: ImgProps) => (
				<Image
					className={className || "max-w-full h-auto my-4 rounded"}
					alt={alt || ""}
					src={src || ""}
					width={Number(width) || 800}
					height={Number(height) || 400}
					unoptimized
				/>
			),
			table: ({ children, ...props }: TableProps) => (
				<div className="overflow-x-auto my-4">
					<table className="min-w-full border-collapse" {...props}>{children}</table>
				</div>
			),
			th: ({ children, ...props }: ThProps) => (
				<th className="px-2.5 py-1.5 text-left font-bold border border-border" {...props}>{children}</th>
			),
			td: ({ children, ...props }: TdProps) => (
				<td className="px-2.5 py-1.5 border border-border" {...props}>{children}</td>
			),
			code: ({ className, children, ...props }: CodeProps) => {
				const match = /language-(\w+)/.exec(className || "");
				const language = match ? match[1] : "";
				const isInline = !match;

				if (isInline) {
					return (
						<code className="font-mono" {...props}>{children}</code>
					);
				}

				return (
					<CodeBlock language={language}>
						{String(children).replace(/\n$/, "")}
					</CodeBlock>
				);
			},
		}),
		[],
	);

	return (
		<div
			className={cn(
				"text-base leading-[1.5] antialiased max-w-none",
				className,
			)}
		>
			<ReactMarkdown
				rehypePlugins={[rehypeSanitize]}
				remarkPlugins={[remarkGfm]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}

const CodeBlock = ({ children, language }: { children: string; language: string }) => {
	const [copied, setCopied] = useState(false);
	const { resolvedTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(children);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const isDarkTheme = mounted && (resolvedTheme === "dark" || theme === "dark");
	const syntaxTheme = isDarkTheme ? oneDark : oneLight;

	return (
		<div className="relative my-0 rounded-lg overflow-hidden bg-[var(--syntax-bg)]">
			{language && (
				<div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b border-border">
					<span className="text-[11px] font-medium text-muted-foreground lowercase">
						{language}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleCopy}
						className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
						aria-label="Copy code"
					>
						{copied ? (
							<Check className="h-3 w-3 text-green-500" />
						) : (
							<Copy className="h-3 w-3 text-muted-foreground" />
						)}
					</Button>
				</div>
			)}
			{mounted ? (
				<SyntaxHighlighter
					language={language || "text"}
					style={{
						...syntaxTheme,
						'pre[class*="language-"]': {
							...syntaxTheme['pre[class*="language-"]'],
							margin: 0,
							border: "none",
							borderRadius: 0,
							background: "var(--syntax-bg)",
						},
						'code[class*="language-"]': {
							...syntaxTheme['code[class*="language-"]'],
							border: "none",
							background: "var(--syntax-bg)",
						},
					}}
					customStyle={{
						margin: 0,
						borderRadius: 0,
						fontSize: "0.875em",
						lineHeight: "1.5em",
						backgroundColor: "var(--syntax-bg)",
						border: "none",
						padding: "24px",
					}}
					codeTagProps={{
						className: "font-mono",
						style: { border: "none", background: "var(--syntax-bg)" },
					}}
					showLineNumbers={false}
					wrapLines={false}
					lineProps={{
						style: {
							wordBreak: "break-all",
							whiteSpace: "pre-wrap",
							border: "none",
							paddingLeft: 0,
							paddingRight: 0,
							margin: 0,
						},
					}}
					PreTag="div"
				>
					{children}
				</SyntaxHighlighter>
			) : (
				<div className="p-6">
					<pre className="m-0 p-0 border-0">
						<code className="font-mono border-0 leading-6">{children}</code>
					</pre>
				</div>
			)}
		</div>
	);
};
