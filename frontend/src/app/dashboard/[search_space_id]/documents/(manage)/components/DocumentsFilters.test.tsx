import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentsFilters } from "./DocumentsFilters";
import type { ColumnVisibility } from "./types";

vi.mock("motion/react", () => {
	const React = require("react");
	const motion = new Proxy({}, {
		get: (_target: any, prop: string) => {
			return React.forwardRef((props: any, ref: any) => {
				const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
				return React.createElement(prop, { ...rest, ref });
			});
		},
	});
	return {
		motion,
		AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
	};
});

const defaultColumnVisibility: ColumnVisibility = {
	title: true,
	document_type: true,
	content: true,
	chunks: true,
	created_at: true,
	favorite: true,
};

const baseProps = {
	typeCounts: { PDF: 5, DOCX: 3 } as Record<string, number>,
	selectedIds: new Set([1, 2]),
	onSearch: vi.fn(),
	searchValue: "",
	onBulkDelete: vi.fn(),
	onToggleType: vi.fn(),
	activeTypes: [] as string[],
	columnVisibility: defaultColumnVisibility,
	onToggleColumn: vi.fn(),
	favoriteStatus: "all" as const,
	onFavoriteStatusChange: vi.fn(),
};

describe("DocumentsFilters", () => {
	it("renders bulk Delete button when canDelete=true and selectedIds has items", () => {
		render(<DocumentsFilters {...baseProps} canDelete={true} />);

		const deleteButtons = screen.getAllByText("Delete");
		expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
	});

	it("does NOT render bulk Delete button when canDelete=false and selectedIds has items", () => {
		render(<DocumentsFilters {...baseProps} canDelete={false} />);

		expect(screen.queryByText("Delete")).toBeNull();
	});

	it("renders bulk Delete button when canDelete is undefined (default true) and selectedIds has items", () => {
		render(<DocumentsFilters {...baseProps} />);

		const deleteButtons = screen.getAllByText("Delete");
		expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
	});

	it("does not render bulk Delete button when selectedIds is empty even if canDelete=true", () => {
		render(<DocumentsFilters {...baseProps} selectedIds={new Set()} canDelete={true} />);

		expect(screen.queryByText("Delete")).toBeNull();
	});
});
