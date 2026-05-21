"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useId, useState } from "react";
import useDeleteNotebook from "@/api/notebooks/hooks/useDeleteNotebook";
import useGetNotebooks from "@/api/notebooks/hooks/useGetNotebooks";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { PaginationControls } from "../../documents/(manage)/components/PaginationControls";
import { NotebooksFilters } from "./components/notebooks-filters";
import { NotebooksTable, type SortKey } from "./components/notebooks-table";

const DEBOUNCE_MS = 400;

export default function NotebooksManagePage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const id = useId();

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, DEBOUNCE_MS);
	const [status, setStatus] = useState<"all" | "published" | "unpublished">(
		"all",
	);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState(25);
	const [sortKey, setSortKey] = useState<SortKey>("created");
	const [sortDesc, setSortDesc] = useState(true);

	const { data, isLoading } = useGetNotebooks({
		search_space_id: searchSpaceIdNum,
		search: debouncedSearch,
		status,
		sort: sortKey,
		sortDir: sortDesc ? "desc" : "asc",
		skip: pageIndex * pageSize,
		limit: pageSize,
	});

	const notebooks = data?.items ?? [];
	const total = data?.total ?? 0;

	const deleteMutation = useDeleteNotebook();

	const handleDelete = (notebookId: number) => {
		deleteMutation.mutate({ searchSpaceId: searchSpaceIdNum, notebookId });
	};

	const pageEnd = Math.min((pageIndex + 1) * pageSize, total);
	const canPrev = pageIndex > 0;
	const canNext = pageEnd < total;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="w-full px-6 py-4"
		>
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Link
							href={`/dashboard/${search_space_id}/notebooks`}
							className="hover:underline"
						>
							Notebooks
						</Link>
					</div>
					<h1 className="text-3xl font-bold tracking-tight">
						Manage Notebooks
					</h1>
					<p className="text-muted-foreground mt-2">
						Create, edit, and manage your notebooks
					</p>
				</div>
				<Button
					onClick={() =>
						router.push(`/dashboard/${search_space_id}/notebooks/create`)
					}
				>
					<Plus className="mr-2 h-4 w-4" />
					Create Notebook
				</Button>
			</div>

			<div className="mt-6 space-y-6">
				<NotebooksFilters
					searchValue={search}
					onSearch={(v) => {
						setSearch(v);
						setPageIndex(0);
					}}
					status={status}
					onStatusChange={(s) => {
						setStatus(s);
						setPageIndex(0);
					}}
				/>
				<NotebooksTable
					notebooks={notebooks}
					searchSpaceId={search_space_id}
					isLoading={isLoading}
					onDelete={handleDelete}
					isDeleting={deleteMutation.isPending}
					sortKey={sortKey}
					sortDesc={sortDesc}
					onSortChange={(key) => {
						if (sortKey === key) setSortDesc((v) => !v);
						else {
							setSortKey(key);
							setSortDesc(key === "created");
						}
					}}
				/>
				<PaginationControls
					pageIndex={pageIndex}
					pageSize={pageSize}
					total={total}
					onPageSizeChange={(s) => {
						setPageSize(s);
						setPageIndex(0);
					}}
					onFirst={() => setPageIndex(0)}
					onPrev={() => setPageIndex((i) => Math.max(0, i - 1))}
					onNext={() => setPageIndex((i) => (pageEnd < total ? i + 1 : i))}
					onLast={() =>
						setPageIndex(Math.max(0, Math.ceil(total / pageSize) - 1))
					}
					canPrev={canPrev}
					canNext={canNext}
					id={id}
				/>
			</div>
		</motion.div>
	);
}
