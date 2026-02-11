"use client";

import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useState,
	type CSSProperties,
} from "react";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import { useDocuments, type Document } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

export interface DocumentMentionPickerRef {
	selectHighlighted: () => void;
	moveUp: () => void;
	moveDown: () => void;
}

interface DocumentMentionPickerProps {
	searchSpaceId: number;
	onSelectionChange: (documents: Pick<Document, "id" | "title" | "document_type">[]) => void;
	onDone: () => void;
	initialSelectedDocuments?: Pick<Document, "id" | "title" | "document_type">[];
	externalSearch?: string;
	containerStyle?: CSSProperties;
}

export const DocumentMentionPicker = forwardRef<
	DocumentMentionPickerRef,
	DocumentMentionPickerProps
>(function DocumentMentionPicker(
	{
		searchSpaceId,
		onSelectionChange,
		onDone,
		initialSelectedDocuments = [],
		externalSearch = "",
		containerStyle,
	},
	ref,
) {
	const { documents, loading } = useDocuments(searchSpaceId, { lazy: false, pageSize: 200 });
	const [highlightedIndex, setHighlightedIndex] = useState(0);

	const selectedKeys = useMemo(
		() => new Set(initialSelectedDocuments.map((d) => `${d.document_type}:${d.id}`)),
		[initialSelectedDocuments],
	);

	const filtered = useMemo(() => {
		const q = externalSearch.trim().toLowerCase();
		return documents
			.filter((doc) => !selectedKeys.has(`${doc.document_type}:${doc.id}`))
			.filter((doc) => (q ? doc.title.toLowerCase().includes(q) : true))
			.slice(0, 30)
			.map((doc) => ({
				id: doc.id,
				title: doc.title,
				document_type: doc.document_type,
			}));
	}, [documents, selectedKeys, externalSearch]);

	const select = useCallback(
		(doc: (typeof filtered)[number] | undefined) => {
			if (!doc) return;
			onSelectionChange([...initialSelectedDocuments, doc]);
			onDone();
		},
		[onSelectionChange, initialSelectedDocuments, onDone],
	);

	useImperativeHandle(
		ref,
		() => ({
			selectHighlighted: () => select(filtered[highlightedIndex]),
			moveUp: () => {
				if (filtered.length === 0) return;
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
			},
			moveDown: () => {
				if (filtered.length === 0) return;
				setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
			},
		}),
		[filtered, highlightedIndex, select],
	);

	if (!loading && filtered.length === 0) return null;

	return (
		<div
			className="fixed z-[9999] w-[320px] max-h-[280px] overflow-y-auto rounded-lg border bg-popover shadow-2xl"
			style={containerStyle}
		>
			{loading ? (
				<div className="flex items-center justify-center p-4">
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			) : (
				<div className="py-1 px-2">
					{filtered.map((doc, index) => (
						<button
							key={`${doc.document_type}:${doc.id}`}
							type="button"
							onClick={() => select(doc)}
							onMouseEnter={() => setHighlightedIndex(index)}
							className={cn(
								"w-full flex items-center gap-2 px-3 py-2 text-left transition-colors rounded-md cursor-pointer",
								highlightedIndex === index && "bg-accent",
							)}
						>
							<span className="shrink-0 text-muted-foreground text-sm">
								{getConnectorIcon(doc.document_type)}
							</span>
							<span className="flex-1 text-sm truncate" title={doc.title}>
								{doc.title}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
});
