import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotebooksTable } from "./notebooks-table";
import type { NotebookListItem } from "@/api/notebooks/types";

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

vi.mock("next/image", () => ({
	default: () => <div data-testid="next-image" />,
}));

const publishedNotebook: NotebookListItem = {
	id: 1,
	title: "Test Notebook",
	slug: "test-notebook",
	excerpt: "Test",
	headline_image_url: null,
	is_published: true,
	published_at: "2025-01-01",
	search_space_id: 1,
	author_id: "user1",
	created_at: "2025-01-01",
	updated_at: "2025-01-01",
};

const unpublishedNotebook: NotebookListItem = {
	...publishedNotebook,
	id: 2,
	title: "Unpublished Notebook",
	slug: "unpublished-notebook",
	is_published: false,
	published_at: null,
};

const baseProps = {
	notebooks: [publishedNotebook],
	searchSpaceId: "1",
	isLoading: false,
	onDelete: vi.fn(),
	isDeleting: false,
	sortKey: "created" as const,
	sortDesc: true,
	onSortChange: vi.fn(),
};

describe("NotebooksTable", () => {
	it("renders Edit and Delete buttons when canModify=true", () => {
		render(<NotebooksTable {...baseProps} canModify={true} />);

		expect(screen.getByText("Edit")).toBeDefined();
		expect(screen.getByText("Delete")).toBeDefined();
	});

	it("renders Edit and Delete buttons when canModify is undefined (default true)", () => {
		render(<NotebooksTable {...baseProps} />);

		expect(screen.getByText("Edit")).toBeDefined();
		expect(screen.getByText("Delete")).toBeDefined();
	});

	it("does NOT render Edit or Delete buttons when canModify=false", () => {
		render(<NotebooksTable {...baseProps} canModify={false} />);

		expect(screen.queryByText("Edit")).toBeNull();
		expect(screen.queryByText("Delete")).toBeNull();
	});

	it("still renders notebook title link when canModify=false", () => {
		render(<NotebooksTable {...baseProps} canModify={false} />);

		expect(screen.getByText("Test Notebook")).toBeDefined();
	});

	it("renders View public URL link for published notebooks when canModify=true", () => {
		render(<NotebooksTable {...baseProps} canModify={true} />);

		const publicLink = screen.getByText("View public URL").closest("a");
		expect(publicLink).toBeDefined();
		expect(publicLink?.getAttribute("href")).toContain("/public/notebooks/");
	});

	it("renders View public URL link for published notebooks when canModify=false", () => {
		render(<NotebooksTable {...baseProps} canModify={false} />);

		const publicLink = screen.getByText("View public URL").closest("a");
		expect(publicLink).toBeDefined();
		expect(publicLink?.getAttribute("href")).toContain("/public/notebooks/");
	});

	it("does NOT render View public URL link for unpublished notebooks", () => {
		render(<NotebooksTable {...baseProps} notebooks={[unpublishedNotebook]} canModify={true} />);

		expect(screen.queryByText("View public URL")).toBeNull();
	});
});
