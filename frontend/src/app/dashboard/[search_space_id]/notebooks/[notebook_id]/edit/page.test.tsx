import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: "light" }),
}));

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();

let notebookIsPublished = false;

const mockNotebookData = {
	id: 1,
	title: "My Notebook",
	slug: "my-notebook-abc123",
	content: "<p>Existing content</p>",
	excerpt: "Existing summary",
	get is_published() { return notebookIsPublished; },
	get published_at() { return notebookIsPublished ? "2025-01-15T10:00:00Z" : null; },
	search_space_id: 10,
	author_id: "user-1",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

vi.mock("@/api/notebooks/hooks/useGetNotebook", () => ({
	default: () => ({
		data: mockNotebookData,
		isLoading: false,
	}),
}));

vi.mock("@/api/notebooks/hooks/useUpdateNotebook", () => ({
	default: () => ({
		mutate: mockMutate,
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

vi.mock("@/api/notebooks/hooks/usePublishNotebook", () => ({
	default: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const original = await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...original,
		useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
	};
});

vi.mock("@/components/notebook/NotebookEditor", () => ({
	NotebookEditor: ({ onChange }: { onChange: (content: string) => void }) => (
		<div data-testid="notebook-editor">
			<button type="button" onClick={() => onChange("new content")}>
				Change Content
			</button>
		</div>
	),
}));

vi.mock("@/components/notebook/NotebookPreviewModal", () => ({
	NotebookPreviewModal: ({ open, title, excerpt, content }: Record<string, unknown>) =>
		open ? (
			<div data-testid="preview-modal">
				<span data-testid="preview-title">{title as string}</span>
				<span data-testid="preview-excerpt">{excerpt as string}</span>
				<span data-testid="preview-content">{content as string}</span>
			</div>
		) : null,
}));

vi.mock("@/components/notebook/NotebookViewer", () => ({
	NotebookViewer: () => <div data-testid="notebook-viewer" />,
}));

vi.mock("react", async (importOriginal) => {
	const original = await importOriginal<typeof import("react")>();
	return {
		...original,
		use: (value: unknown) => {
			if (value && typeof value === "object" && "then" in (value as object)) {
				const promise = value as Promise<unknown>;
				if ("_result" in promise) {
					return (promise as Promise<unknown> & { _result: unknown })._result;
				}
				promise.then(
					(result) => {
						(promise as Promise<unknown> & { _result: unknown })._result = result;
						(promise as Promise<unknown> & { _status: number })._status = 1;
					},
				);
				throw promise;
			}
			return original.use(value);
		},
	};
});

function createResolvedPromise<T>(value: T): Promise<T> & { _result: T; _status: number } {
	const promise = Promise.resolve(value) as Promise<T> & { _result: T; _status: number };
	promise._result = value;
	promise._status = 1;
	return promise;
}

function Wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return (
		<QueryClientProvider client={queryClient}>
			<Suspense fallback={<div>Loading...</div>}>
				{children}
			</Suspense>
		</QueryClientProvider>
	);
}

// We need to import the component AFTER mocks are set up
import EditNotebookPage from "./page";

describe("EditNotebookPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMutateAsync.mockResolvedValue({});
		notebookIsPublished = false;
	});

	it("renders the Preview button", async () => {
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Preview")).toBeInTheDocument();
		});
	});

	it("renders the Publish button for unpublished notebooks", async () => {
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Publish")).toBeInTheDocument();
		});
	});

	it("does not render the Publish button for already-published notebooks", async () => {
		notebookIsPublished = true;

		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Save Changes")).toBeInTheDocument();
		});
		expect(screen.queryByText("Publish")).not.toBeInTheDocument();
	});

	it("opens preview modal when Preview button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Preview")).toBeInTheDocument();
		});
		await user.click(screen.getByText("Preview"));
		expect(screen.getByTestId("preview-modal")).toBeInTheDocument();
	});

	it("passes current draft data to preview modal", async () => {
		const user = userEvent.setup();
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Preview")).toBeInTheDocument();
		});
		await user.click(screen.getByText("Preview"));
		const modal = screen.getByTestId("preview-modal");
		expect(modal).toHaveTextContent("My Notebook");
	});

	it("opens publish confirmation dialog when Publish is clicked", async () => {
		const user = userEvent.setup();
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
		});
		await user.click(screen.getByRole("button", { name: /publish/i }));
		await waitFor(() => {
			expect(screen.getByText("Publish Notebook")).toBeInTheDocument();
		});
	});

	it("saves and publishes when publish action is confirmed", async () => {
		const user = userEvent.setup();
		mockMutateAsync.mockResolvedValue({});
		mockMutate.mockImplementation((_params: unknown, opts: Record<string, unknown>) => {
			if (opts && opts.onSuccess) (opts.onSuccess as Function)({}, _params);
		});
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
		});
		await user.click(screen.getByRole("button", { name: /publish/i }));
		await waitFor(() => {
			expect(screen.getByText("Publish Notebook")).toBeInTheDocument();
		});
		const allButtons = screen.getAllByRole("button");
		const confirmPublish = allButtons.find((b) => b.textContent === "Publish");
		if (confirmPublish) {
			await user.click(confirmPublish);
		}
		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalled();
		});
	});

	it("renders the Save Changes button", async () => {
		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Save Changes")).toBeInTheDocument();
		});
	});

	it("shows Published badge for published notebooks", async () => {
		notebookIsPublished = true;

		render(
			<EditNotebookPage params={createResolvedPromise({ search_space_id: "10", notebook_id: "1" })} />,
			{ wrapper: Wrapper },
		);
		await waitFor(() => {
			expect(screen.getByText("Published")).toBeInTheDocument();
		});
	});
});
