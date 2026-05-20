import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import React from "react";

import { NotebookPreviewModal } from "@/components/notebook/NotebookPreviewModal";

vi.mock("@/components/notebook/NotebookViewer", () => ({
	NotebookViewer: ({ content }: { content: string }) => (
		<div data-testid="notebook-viewer">{content}</div>
	),
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: "light" }),
}));

const defaultProps = {
	open: true,
	onOpenChange: vi.fn(),
	title: "Test Notebook Title",
	excerpt: "A test summary of the notebook",
	content: '<p>Hello world</p>',
	createdAt: "2025-01-15T10:00:00Z",
};

describe("NotebookPreviewModal", () => {
	it("renders the notebook title", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		const titles = screen.getAllByText("Test Notebook Title");
		expect(titles.length).toBeGreaterThanOrEqual(1);
	});

	it("renders the excerpt when provided", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		expect(screen.getByText("A test summary of the notebook")).toBeInTheDocument();
	});

	it("does not render excerpt section when excerpt is empty", () => {
		render(<NotebookPreviewModal {...defaultProps} excerpt="" />);
		expect(screen.queryByText("A test summary of the notebook")).not.toBeInTheDocument();
	});

	it("renders content via NotebookViewer", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		expect(screen.getByTestId("notebook-viewer")).toHaveTextContent("<p>Hello world</p>");
	});

	it("renders the Globe icon in the header", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		const svg = document.querySelector(".lucide-globe");
		expect(svg).toBeInTheDocument();
	});

	it("renders date in metadata header", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		expect(screen.getByText(/January 15, 2025/)).toBeInTheDocument();
	});

	it("renders read time estimate in metadata header", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		expect(screen.getByText(/1 min read/)).toBeInTheDocument();
	});

	it("renders author name when provided", () => {
		render(<NotebookPreviewModal {...defaultProps} authorName="Jane Doe" />);
		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
	});

	it("renders 'Unknown Author' when no author name", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		expect(screen.getByText("Unknown Author")).toBeInTheDocument();
	});

	it("calls onOpenChange when close button is clicked", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(<NotebookPreviewModal {...defaultProps} onOpenChange={onOpenChange} />);
		const allButtons = screen.getAllByRole("button");
		const closeButtons = allButtons.filter((btn) => {
			const srOnly = btn.querySelector("span");
			return srOnly?.textContent === "Close preview" || srOnly?.textContent === "Close";
		});
		expect(closeButtons.length).toBeGreaterThan(0);
		await user.click(closeButtons[0]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not render when open is false", () => {
		render(<NotebookPreviewModal {...defaultProps} open={false} />);
		expect(screen.queryByText("Test Notebook Title")).not.toBeInTheDocument();
	});

	it("shows 'Untitled' when title is empty", () => {
		render(<NotebookPreviewModal {...defaultProps} title="" />);
		const untitled = screen.getAllByText("Untitled");
		expect(untitled.length).toBeGreaterThanOrEqual(1);
	});

	it("has the same content area structure as the public notebook detail page", () => {
		render(<NotebookPreviewModal {...defaultProps} />);
		const h1Elements = screen.getAllByRole("heading", { level: 1 });
		expect(h1Elements.length).toBeGreaterThanOrEqual(2);
		const mainTitle = h1Elements.find((h) => h.classList.contains("text-4xl"));
		expect(mainTitle).toBeInTheDocument();
		expect(mainTitle?.textContent).toBe("Test Notebook Title");
	});
});
