"use client";

import { CircleX, Filter, ListFilter } from "lucide-react";
import { motion } from "motion/react";
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function NotebooksFilters({
	onSearch,
	searchValue,
	status,
	onStatusChange,
}: {
	onSearch: (v: string) => void;
	searchValue: string;
	status: "all" | "published" | "unpublished";
	onStatusChange: (status: "all" | "published" | "unpublished") => void;
}) {
	const id = React.useId();
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<motion.div
			className="flex flex-wrap items-center justify-between gap-3"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
		>
			<div className="flex items-center gap-3">
				<motion.div
					className="relative"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 30 }}
				>
					<Input
						id={`${id}-input`}
						ref={inputRef}
						className="peer min-w-60 ps-9"
						value={searchValue}
						onChange={(e) => onSearch(e.target.value)}
						placeholder="Search notebooks..."
						type="text"
						aria-label="Search notebooks"
					/>
					<motion.div
						className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50"
						initial={{ scale: 0.8 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.1 }}
					>
						<ListFilter size={16} strokeWidth={2} aria-hidden="true" />
					</motion.div>
					{Boolean(searchValue) && (
						<motion.button
							className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-ring/70"
							aria-label="Clear filter"
							onClick={() => {
								onSearch("");
								inputRef.current?.focus();
							}}
							initial={{ opacity: 0, rotate: -90 }}
							animate={{ opacity: 1, rotate: 0 }}
							exit={{ opacity: 0, rotate: 90 }}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
						>
							<CircleX size={16} strokeWidth={2} aria-hidden="true" />
						</motion.button>
					)}
				</motion.div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}
						>
							<Button variant="outline">
								<Filter
									className="-ms-1 me-2 opacity-60"
									size={16}
									strokeWidth={2}
									aria-hidden="true"
								/>
								{status === "all"
									? "All"
									: status === "published"
										? "Published"
										: "Unpublished"}
							</Button>
						</motion.div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuLabel>Filter by status</DropdownMenuLabel>
						{(
							[
								["all", "All"],
								["published", "Published"],
								["unpublished", "Unpublished"],
							] as Array<["all" | "published" | "unpublished", string]>
						).map(([s, label]) => (
							<DropdownMenuCheckboxItem
								key={s}
								checked={status === s}
								onCheckedChange={() => onStatusChange(s)}
								onSelect={(e) => e.preventDefault()}
							>
								{label}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</motion.div>
	);
}
