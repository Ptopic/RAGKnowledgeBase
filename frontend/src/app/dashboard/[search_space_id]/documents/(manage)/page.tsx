"use client";

import { motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { useDocuments } from "@/hooks/use-documents";
import { useDebounce } from "@/hooks/use-debounce";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";

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

	const onBulkDelete = async () => {
		if (selectedIds.size === 0) {
			toast.error("No rows selected");
			return;
		}
		try {
			const results = await Promise.allSettled(
				Array.from(selectedIds).map((id) => deleteDocument?.(id)),
			);
			const okCount = results.filter((r) => r.status === "fulfilled").length;
			if (okCount === selectedIds.size)
				toast.success(`Successfully deleted ${okCount} document(s)`);
			else toast.error("Some documents could not be deleted");
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
