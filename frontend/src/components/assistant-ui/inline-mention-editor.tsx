"use client";

import { X } from "lucide-react";
import {
	createElement,
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import ReactDOMServer from "react-dom/server";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import type { Document } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

export interface MentionedDocument {
	id: number;
	title: string;
	document_type?: string;
}

export interface InlineMentionEditorRef {
	focus: () => void;
	clear: () => void;
	setText: (text: string) => void;
	getText: () => string;
	getMentionedDocuments: () => MentionedDocument[];
	insertDocumentChip: (doc: Pick<Document, "id" | "title" | "document_type">) => void;
}

interface InlineMentionEditorProps {
	placeholder?: string;
	onMentionTrigger?: (query: string) => void;
	onMentionClose?: () => void;
	onSubmit?: () => void;
	onChange?: (text: string, docs: MentionedDocument[]) => void;
	onDocumentRemove?: (docId: number, docType?: string) => void;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	disabled?: boolean;
	className?: string;
	initialDocuments?: MentionedDocument[];
}

const CHIP_DATA_ATTR = "data-mention-chip";
const CHIP_ID_ATTR = "data-mention-id";
const CHIP_DOCTYPE_ATTR = "data-mention-doctype";

function isChipElement(node: Node | null): node is HTMLSpanElement {
	return (
		node !== null &&
		node.nodeType === Node.ELEMENT_NODE &&
		(node as Element).hasAttribute(CHIP_DATA_ATTR)
	);
}

function getChipId(element: Element): number | null {
	const idStr = element.getAttribute(CHIP_ID_ATTR);
	if (!idStr) return null;
	const id = Number.parseInt(idStr, 10);
	return Number.isNaN(id) ? null : id;
}

function getChipDocType(element: Element): string {
	return element.getAttribute(CHIP_DOCTYPE_ATTR) ?? "UNKNOWN";
}

export const InlineMentionEditor = forwardRef<InlineMentionEditorRef, InlineMentionEditorProps>(
	(
		{
			placeholder = "Type @ to mention documents...",
			onMentionTrigger,
			onMentionClose,
			onSubmit,
			onChange,
			onDocumentRemove,
			onKeyDown,
			disabled = false,
			className,
			initialDocuments = [],
		},
		ref,
	) => {
		const editorRef = useRef<HTMLDivElement>(null);
		const [isEmpty, setIsEmpty] = useState(true);
		const [mentionedDocs, setMentionedDocs] = useState<Map<string, MentionedDocument>>(
			() => new Map(initialDocuments.map((d) => [`${d.document_type ?? "UNKNOWN"}:${d.id}`, d])),
		);

		useEffect(() => {
			if (initialDocuments.length > 0) {
				setMentionedDocs(
					new Map(initialDocuments.map((d) => [`${d.document_type ?? "UNKNOWN"}:${d.id}`, d])),
				);
			}
		}, [initialDocuments]);

		const focusAtEnd = useCallback(() => {
			if (!editorRef.current) return;
			editorRef.current.focus();
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(editorRef.current);
			range.collapse(false);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}, []);

		const getText = useCallback((): string => {
			if (!editorRef.current) return "";

			let text = "";
			const walker = document.createTreeWalker(
				editorRef.current,
				NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
				{
					acceptNode: (node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							const el = node as Element;
							if (el.hasAttribute(CHIP_DATA_ATTR)) {
								return NodeFilter.FILTER_REJECT;
							}
							return NodeFilter.FILTER_SKIP;
						}
						return NodeFilter.FILTER_ACCEPT;
					},
				},
			);

			let node: Node | null = walker.nextNode();
			while (node) {
				if (node.nodeType === Node.TEXT_NODE) {
					text += node.textContent;
				}
				node = walker.nextNode();
			}

			return text.trim();
		}, []);

		const getMentionedDocuments = useCallback((): MentionedDocument[] => {
			return Array.from(mentionedDocs.values());
		}, [mentionedDocs]);

		const createChipElement = useCallback(
			(doc: MentionedDocument): HTMLSpanElement => {
				const chip = document.createElement("span");
				chip.setAttribute(CHIP_DATA_ATTR, "true");
				chip.setAttribute(CHIP_ID_ATTR, String(doc.id));
				chip.setAttribute(CHIP_DOCTYPE_ATTR, doc.document_type ?? "UNKNOWN");
				chip.contentEditable = "false";
				chip.className =
					"inline-flex items-center gap-1 mx-0.5 pl-1 pr-0.5 py-0.5 rounded bg-primary/10 text-xs font-bold text-primary/60 select-none";
				chip.style.userSelect = "none";
				chip.style.verticalAlign = "baseline";

				const iconSpan = document.createElement("span");
				iconSpan.className = "shrink-0 flex items-center text-muted-foreground";
				iconSpan.innerHTML = ReactDOMServer.renderToString(
					getConnectorIcon(doc.document_type ?? "UNKNOWN", "h-3 w-3"),
				);

				const titleSpan = document.createElement("span");
				titleSpan.className = "max-w-[120px] truncate";
				titleSpan.textContent = doc.title;
				titleSpan.title = doc.title;

				const removeBtn = document.createElement("button");
				removeBtn.type = "button";
				removeBtn.className =
					"size-3 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors ml-0.5";
				removeBtn.innerHTML = ReactDOMServer.renderToString(
					createElement(X, { className: "h-2.5 w-2.5", strokeWidth: 2.5 }),
				);
				removeBtn.onclick = (e) => {
					e.preventDefault();
					e.stopPropagation();
					chip.remove();
					const docKey = `${doc.document_type ?? "UNKNOWN"}:${doc.id}`;
					setMentionedDocs((prev) => {
						const next = new Map(prev);
						next.delete(docKey);
						return next;
					});
					onDocumentRemove?.(doc.id, doc.document_type);
					focusAtEnd();
				};

				chip.appendChild(iconSpan);
				chip.appendChild(titleSpan);
				chip.appendChild(removeBtn);

				return chip;
			},
			[focusAtEnd, onDocumentRemove],
		);

		const insertDocumentChip = useCallback(
			(doc: Pick<Document, "id" | "title" | "document_type">) => {
				if (!editorRef.current) return;
				if (typeof doc.id !== "number" || typeof doc.title !== "string") return;

				const mentionDoc: MentionedDocument = {
					id: doc.id,
					title: doc.title,
					document_type: doc.document_type,
				};

				const docKey = `${doc.document_type ?? "UNKNOWN"}:${doc.id}`;
				setMentionedDocs((prev) => new Map(prev).set(docKey, mentionDoc));

				const selection = window.getSelection();
				if (!selection || selection.rangeCount === 0) {
					const chip = createChipElement(mentionDoc);
					editorRef.current.appendChild(chip);
					editorRef.current.appendChild(document.createTextNode(" "));
					focusAtEnd();
					return;
				}

				const range = selection.getRangeAt(0);
				const textNode = range.startContainer;

				if (textNode.nodeType === Node.TEXT_NODE) {
					const text = textNode.textContent || "";
					const cursorPos = range.startOffset;

					let atIndex = -1;
					for (let i = cursorPos - 1; i >= 0; i--) {
						if (text[i] === "@") {
							atIndex = i;
							break;
						}
					}

					if (atIndex !== -1) {
						const beforeAt = text.slice(0, atIndex);
						const afterCursor = text.slice(cursorPos);

						const chip = createChipElement(mentionDoc);

						const parent = textNode.parentNode;
						if (parent) {
							const beforeNode = document.createTextNode(beforeAt);
							const afterNode = document.createTextNode(` ${afterCursor}`);

							parent.insertBefore(beforeNode, textNode);
							parent.insertBefore(chip, textNode);
							parent.insertBefore(afterNode, textNode);
							parent.removeChild(textNode);

							const newRange = document.createRange();
							newRange.setStart(afterNode, 1);
							newRange.collapse(true);
							selection.removeAllRanges();
							selection.addRange(newRange);
						}
					} else {
						const chip = createChipElement(mentionDoc);
						range.insertNode(chip);
						range.setStartAfter(chip);
						range.collapse(true);

						const space = document.createTextNode(" ");
						range.insertNode(space);
						range.setStartAfter(space);
						range.collapse(true);
					}
				} else {
					const chip = createChipElement(mentionDoc);
					editorRef.current.appendChild(chip);
					editorRef.current.appendChild(document.createTextNode(" "));
					focusAtEnd();
				}

				setIsEmpty(false);

				if (onChange) {
					setTimeout(() => {
						onChange(getText(), getMentionedDocuments());
					}, 0);
				}
			},
			[createChipElement, focusAtEnd, getText, getMentionedDocuments, onChange],
		);

		const clear = useCallback(() => {
			if (editorRef.current) {
				editorRef.current.innerHTML = "";
				setIsEmpty(true);
				setMentionedDocs(new Map());
			}
		}, []);

		const setText = useCallback(
			(text: string) => {
				if (!editorRef.current) return;
				editorRef.current.innerHTML = "";
				editorRef.current.appendChild(document.createTextNode(text));
				setIsEmpty(text.trim().length === 0 && mentionedDocs.size === 0);
				onChange?.(text.trim(), Array.from(mentionedDocs.values()));
				focusAtEnd();
			},
			[focusAtEnd, mentionedDocs, onChange],
		);

		useImperativeHandle(ref, () => ({
			focus: () => editorRef.current?.focus(),
			clear,
			setText,
			getText,
			getMentionedDocuments,
			insertDocumentChip,
		}));

		const handleInput = useCallback(() => {
			if (!editorRef.current) return;

			const text = getText();
			const empty = text.length === 0 && mentionedDocs.size === 0;
			setIsEmpty(empty);

			const selection = window.getSelection();
			let shouldTriggerMention = false;
			let mentionQuery = "";

			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				const textNode = range.startContainer;

				if (textNode.nodeType === Node.TEXT_NODE) {
					const textContent = textNode.textContent || "";
					const cursorPos = range.startOffset;

					let atIndex = -1;
					for (let i = cursorPos - 1; i >= 0; i--) {
						if (textContent[i] === "@") {
							atIndex = i;
							break;
						}
						if (textContent[i] === " " || textContent[i] === "\n") {
							break;
						}
					}

					if (atIndex !== -1) {
						const query = textContent.slice(atIndex + 1, cursorPos);
						if (!query.startsWith(" ")) {
							shouldTriggerMention = true;
							mentionQuery = query;
						}
					}
				}
			}

			if (!shouldTriggerMention) {
				onMentionClose?.();
			} else {
				onMentionTrigger?.(mentionQuery);
			}

			onChange?.(text, Array.from(mentionedDocs.values()));
		}, [getText, mentionedDocs, onChange, onMentionTrigger, onMentionClose]);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLDivElement>) => {
				onKeyDown?.(e);
				if (e.defaultPrevented) return;

				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					onSubmit?.();
					return;
				}

				if (e.key === "Backspace") {
					const selection = window.getSelection();
					if (selection && selection.rangeCount > 0) {
						const range = selection.getRangeAt(0);
						if (range.collapsed) {
							const node = range.startContainer;
							const offset = range.startOffset;

							if (node.nodeType === Node.TEXT_NODE && offset === 0) {
								const prevSibling = node.previousSibling;
								if (isChipElement(prevSibling)) {
									e.preventDefault();
									const chipId = getChipId(prevSibling);
									const chipDocType = getChipDocType(prevSibling);
									if (chipId !== null) {
										prevSibling.remove();
										const chipKey = `${chipDocType}:${chipId}`;
										setMentionedDocs((prev) => {
											const next = new Map(prev);
											next.delete(chipKey);
											return next;
										});
										onDocumentRemove?.(chipId, chipDocType);
									}
									return;
								}
							}
						}
					}
				}
			},
			[onKeyDown, onSubmit, onDocumentRemove],
		);

		const handlePaste = useCallback((e: React.ClipboardEvent) => {
			e.preventDefault();
			const text = e.clipboardData.getData("text/plain");
			document.execCommand("insertText", false, text);
		}, []);

		return (
			<div className="relative w-full">
				<div
					ref={editorRef}
					contentEditable={!disabled}
					suppressContentEditableWarning
					tabIndex={disabled ? -1 : 0}
					onInput={handleInput}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					className={cn(
						"min-h-[24px] max-h-32 overflow-y-auto",
						"text-sm outline-none",
						"whitespace-pre-wrap break-words",
						disabled && "opacity-50 cursor-not-allowed",
						className,
					)}
					style={{ wordBreak: "break-word" }}
					data-placeholder={placeholder}
					aria-label="Message input with inline mentions"
					role="textbox"
					aria-multiline="true"
				/>
				{isEmpty && (
					<div
						key={placeholder}
						className="absolute top-0 left-0 pointer-events-none text-muted-foreground text-sm animate-in fade-in duration-1000"
						aria-hidden="true"
					>
						{placeholder}
					</div>
				)}
			</div>
		);
	},
);

InlineMentionEditor.displayName = "InlineMentionEditor";
