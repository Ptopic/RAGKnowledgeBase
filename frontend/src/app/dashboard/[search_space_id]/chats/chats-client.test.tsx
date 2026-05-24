import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the search space hook
vi.mock("@/api/searchspaces/hooks/useGetSearchSpace", () => ({
	default: () => ({
		data: mockSearchSpaceData,
		isLoading: false,
		error: null,
	}),
}));

let mockSearchSpaceData: any = null;

// Mock chat hooks
vi.mock("@/api/chats/hooks/useGetChats", () => ({
	default: () => ({
		data: mockChatsData,
		isLoading: false,
		error: null,
	}),
}));

let mockChatsData: any = [];

vi.mock("@/api/chats/hooks/useDeleteChat", () => ({
	default: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

vi.mock("@/api/chats/hooks/useAddFavoriteChat", () => ({
	default: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/api/chats/hooks/useRemoveFavoriteChat", () => ({
	default: () => ({ mutate: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-debounce", () => ({
	useDebounce: (val: string) => val,
}));

import ChatsPageClient from "./chats-client";

const mockChat = {
	id: 1,
	title: "Test Chat",
	type: "QNA",
	created_at: new Date().toISOString(),
	search_space_id: 1,
	is_favorite: false,
};

describe("ChatsPageClient", () => {
	it("should show Delete Chat option for OWNER", async () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
		mockChatsData = [mockChat];

		render(<ChatsPageClient searchSpaceId="1" />);

		const moreButtons = screen.getAllByRole("button", { name: /open menu/i });
		await userEvent.setup().click(moreButtons[0]);

		expect(screen.getByText("Delete Chat")).toBeInTheDocument();
	});

	it("should show Delete Chat option for EDITOR", async () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: false, role: "EDITOR" };
		mockChatsData = [mockChat];

		render(<ChatsPageClient searchSpaceId="1" />);

		const moreButtons = screen.getAllByRole("button", { name: /open menu/i });
		await userEvent.setup().click(moreButtons[0]);

		expect(screen.getByText("Delete Chat")).toBeInTheDocument();
	});

	it("should hide Delete Chat option for VIEWER", async () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: false, role: "VIEWER" };
		mockChatsData = [mockChat];

		render(<ChatsPageClient searchSpaceId="1" />);

		const moreButtons = screen.getAllByRole("button", { name: /open menu/i });
		await userEvent.setup().click(moreButtons[0]);

		expect(screen.queryByText("Delete Chat")).not.toBeInTheDocument();
	});
});
