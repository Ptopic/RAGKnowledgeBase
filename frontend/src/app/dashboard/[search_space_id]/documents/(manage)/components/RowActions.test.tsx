import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowActions } from "./RowActions";
import type { Document } from "./types";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/json-metadata-viewer", () => ({
	JsonMetadataViewer: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const mockDocument: Document = {
	id: 1,
	title: "Test Doc",
	document_type: "PDF",
	content: "test",
	document_metadata: null,
	created_at: "2025-01-01",
	search_space_id: 1,
	chunks_count: 0,
};

const defaultProps = {
	document: mockDocument,
	deleteDocument: vi.fn(),
	refreshDocuments: vi.fn(),
};

async function openDropdown() {
	const trigger = screen.getByRole("button", { name: /open menu/i });
	await userEvent.setup().click(trigger);
}

describe("RowActions", () => {
	it("renders Delete dropdown item when canDelete is true", async () => {
		render(<RowActions {...defaultProps} canDelete={true} />);
		await openDropdown();

		expect(screen.getByText("Delete")).toBeDefined();
	});

	it("renders Delete dropdown item when canDelete is undefined (default)", async () => {
		render(<RowActions {...defaultProps} />);
		await openDropdown();

		expect(screen.getByText("Delete")).toBeDefined();
	});

	it("does NOT render Delete dropdown item when canDelete is false", async () => {
		render(<RowActions {...defaultProps} canDelete={false} />);
		await openDropdown();

		expect(screen.queryByText("Delete")).toBeNull();
	});

	it("still renders View Metadata when canDelete is false", async () => {
		render(<RowActions {...defaultProps} canDelete={false} />);
		await openDropdown();

		expect(screen.getByText("View Metadata")).toBeDefined();
	});

	it("renders View Metadata when canDelete is true", async () => {
		render(<RowActions {...defaultProps} canDelete={true} />);
		await openDropdown();

		expect(screen.getByText("View Metadata")).toBeDefined();
	});
});
