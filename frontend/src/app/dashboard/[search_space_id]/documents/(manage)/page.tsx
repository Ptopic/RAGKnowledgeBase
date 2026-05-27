"use client";

import { motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { useDocuments } from "@/hooks/use-documents";
import { useDebounce } from "@/hooks/use-debounce";
import { useSSE } from "@/hooks/useSSE";
import useBulkDeleteDocuments from "@/api/documents/hooks/useBulkDeleteDocuments";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { useQueryClient } from "@tanstack/react-query";
import { DOCUMENTS_SSE_TOPIC } from "@/shared/sseTopics";
import { DOCUMENTS, DOCUMENT_TYPE_COUNTS } from "@/shared/queryKeys";

import { DocumentsFilters } from "./components/DocumentsFilters";
import {
    DocumentsTableShell,
    type SortKey,
} from "./components/DocumentsTableShell";
import { PaginationControls } from "./components/PaginationControls";
import type { ColumnVisibility } from "./components/types";

const DEBOUNCE_MS = 400;

export default function DocumentsTable() {
	const id = useId();
	const params = useParams();
	const searchParams = useSearchParams();
	const router = useRouter();
	const searchSpaceId = Number(params.search_space_id);
	const { data: searchSpace } = useGetSearchSpace(searchSpaceId);
	const canDelete = searchSpace ? searchSpace.is_owner || searchSpace.role === "EDITOR" : false;

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, DEBOUNCE_MS);
	const [activeTypes, setActiveTypes] = useState<string[]>([]);
	const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
		title: true,
		document_type: true,
		content: true,
		chunks: true,
		created_at: true,
		favorite: true,
	});
	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState(50);
	const [sortKey, setSortKey] = useState<SortKey>("created_at");
	const [sortDesc, setSortDesc] = useState(true);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
	const [favoriteStatus, setFavoriteStatus] = useState<"all" | "favorited" | "non_favorited">(
		(searchParams.get("favorite_status") as "all" | "favorited" | "non_favorited") || "all",
	);

	const { mutateAsync: bulkDeleteDocuments } = useBulkDeleteDocuments();

	const queryClient = useQueryClient();
	const { lastEvent, isConnected } = useSSE({ topic: DOCUMENTS_SSE_TOPIC });

	// Use server-side pagination, search, and filtering
	const {
		documents,
		total,
		loading,
		error,
		favoriteIds,
		fetchDocuments,
		searchDocuments,
		deleteDocument,
		getDocumentTypeCounts,
		toggleFavorite,
	} = useDocuments(searchSpaceId, {
		page: pageIndex,
		pageSize: pageSize,
	});

	useEffect(() => {
		if (searchSpaceId && getDocumentTypeCounts) {
			getDocumentTypeCounts().then(setTypeCounts);
		}
	}, [searchSpaceId, getDocumentTypeCounts]);

	useEffect(() => {
		if (searchSpaceId) {
			if (debouncedSearch.trim()) {
				searchDocuments?.(
					debouncedSearch,
					pageIndex,
					pageSize,
					activeTypes.length > 0 ? activeTypes : undefined,
					favoriteStatus,
				);
			} else {
				fetchDocuments?.(
					pageIndex,
					pageSize,
					activeTypes.length > 0 ? activeTypes : undefined,
					favoriteStatus,
				);
			}
		}
	}, [
		pageIndex,
		pageSize,
		debouncedSearch,
		activeTypes,
		favoriteStatus,
		searchSpaceId,
		fetchDocuments,
		searchDocuments,
	]);

	// Display server-filtered results directly
	const displayDocs = documents || [];
	const displayTotal = total;
	const pageStart = pageIndex * pageSize;
	const pageEnd = Math.min(pageStart + pageSize, displayTotal);

	const onToggleType = (type: string, checked: boolean) => {
		setActiveTypes((prev) =>
			checked ? [...prev, type] : prev.filter((t) => t !== type),
		);
		setPageIndex(0);
	};

	const onToggleColumn = (id: keyof ColumnVisibility, checked: boolean) => {
		setColumnVisibility((prev) => ({ ...prev, [id]: checked }));
	};

	const refreshCurrentView = useCallback(async () => {
		if (debouncedSearch.trim()) {
			await searchDocuments?.(
				debouncedSearch,
				pageIndex,
				pageSize,
				activeTypes.length > 0 ? activeTypes : undefined,
				favoriteStatus,
			);
		} else {
			await fetchDocuments?.(
				pageIndex,
				pageSize,
				activeTypes.length > 0 ? activeTypes : undefined,
				favoriteStatus,
			);
		}
	}, [
		debouncedSearch,
		pageIndex,
		pageSize,
		activeTypes,
		favoriteStatus,
		searchDocuments,
		fetchDocuments,
	]);

	useEffect(() => {
		if (!lastEvent?.data) return;
		const { searchSpaceId: eventSearchSpaceId } = lastEvent.data;
		if (eventSearchSpaceId && eventSearchSpaceId !== searchSpaceId) return;
		queryClient.invalidateQueries({ queryKey: [DOCUMENTS, searchSpaceId] });
		queryClient.invalidateQueries({ queryKey: [DOCUMENT_TYPE_COUNTS, searchSpaceId] });
		refreshCurrentView();
	}, [lastEvent, queryClient, searchSpaceId, refreshCurrentView]);

	const connectionCountRef = useRef(0);
	useEffect(() => {
		if (isConnected) {
			connectionCountRef.current++;
			if (connectionCountRef.current > 1) {
				queryClient.invalidateQueries({ queryKey: [DOCUMENTS, searchSpaceId] });
				queryClient.invalidateQueries({ queryKey: [DOCUMENT_TYPE_COUNTS, searchSpaceId] });
			}
		}
	}, [isConnected, queryClient, searchSpaceId]);

	const onBulkDelete = async () => {
		if (selectedIds.size === 0) {
			toast.error("No rows selected");
			return;
		}
		try {
			const result = await bulkDeleteDocuments({
				ids: Array.from(selectedIds),
				searchSpaceId,
			});
			if (result.failed.length === 0) {
				toast.success(`Successfully deleted ${result.deleted.length} document(s)`);
			} else if (result.deleted.length > 0) {
				toast.warning(
					`Deleted ${result.deleted.length} document(s), ${result.failed.length} failed`,
					{
						description: result.failed.map(f => `Document ${f.id}: ${f.reason}`).join('\n'),
						duration: 8000,
					}
				);
			} else {
				toast.error("Failed to delete documents", {
					description: result.failed.map(f => `Document ${f.id}: ${f.reason}`).join('\n'),
					duration: 8000,
				});
			}
			await refreshCurrentView();
			setSelectedIds(new Set());
		} catch (e) {
			console.error(e);
			toast.error("Error deleting documents");
		}
	};

	useEffect(() => {
		const mq = window.matchMedia("(max-width: 768px)");
		const apply = (isSmall: boolean) => {
			setColumnVisibility((prev) => ({
				...prev,
				content: !isSmall,
				created_at: !isSmall,
			}));
		};
		apply(mq.matches);
		const onChange = (e: MediaQueryListEvent) => apply(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		const current = new URLSearchParams(searchParams.toString());
		if (favoriteStatus === "all") {
			current.delete("favorite_status");
		} else {
			current.set("favorite_status", favoriteStatus);
		}
		const newUrl = `${window.location.pathname}?${current.toString()}`;
		router.replace(newUrl, { scroll: false });
	}, [favoriteStatus, router, searchParams]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="w-full px-6 py-4"
		>
			<DocumentsFilters
				typeCounts={typeCounts}
				selectedIds={selectedIds}
				onSearch={setSearch}
				searchValue={search}
				onBulkDelete={onBulkDelete}
				onToggleType={onToggleType}
				activeTypes={activeTypes}
				columnVisibility={columnVisibility}
				onToggleColumn={onToggleColumn}
				favoriteStatus={favoriteStatus}
				onFavoriteStatusChange={(status) => {
					setFavoriteStatus(status);
					setPageIndex(0);
				}}
				canDelete={canDelete}
			/>

			<DocumentsTableShell
				documents={displayDocs}
				loading={!!loading}
				error={!!error}
				onRefresh={refreshCurrentView}
				selectedIds={selectedIds}
				setSelectedIds={setSelectedIds}
				columnVisibility={columnVisibility}
				deleteDocument={(id) => deleteDocument?.(id) ?? Promise.resolve()}
				sortKey={sortKey}
				sortDesc={sortDesc}
				onSortChange={(key) => {
					if (sortKey === key) setSortDesc((v) => !v);
					else {
						setSortKey(key);
						setSortDesc(key === "created_at");
					}
				}}
				favoriteIds={favoriteIds}
				onToggleFavorite={toggleFavorite}
				canDelete={canDelete}
			/>

			<PaginationControls
				pageIndex={pageIndex}
				pageSize={pageSize}
				total={displayTotal}
				onPageSizeChange={(s) => {
					setPageSize(s);
					setPageIndex(0);
				}}
				onFirst={() => setPageIndex(0)}
				onPrev={() => setPageIndex((i) => Math.max(0, i - 1))}
				onNext={() => setPageIndex((i) => (pageEnd < displayTotal ? i + 1 : i))}
				onLast={() =>
					setPageIndex(Math.max(0, Math.ceil(displayTotal / pageSize) - 1))
				}
				canPrev={pageIndex > 0}
				canNext={pageEnd < displayTotal}
				id={id}
			/>
		</motion.div>
	);
}
