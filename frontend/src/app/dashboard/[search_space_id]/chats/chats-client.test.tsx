import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

beforeAll(() => {
	HTMLElement.prototype.hasPointerCapture = HTMLElement.prototype.hasPointerCapture || (() => false);
	HTMLElement.prototype.setPointerCapture = HTMLElement.prototype.setPointerCapture || (() => {});
	HTMLElement.prototype.releasePointerCapture = HTMLElement.prototype.releasePointerCapture || (() => {});
	HTMLElement.prototype.scrollIntoView = HTMLElement.prototype.scrollIntoView || (() => {});
});

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

vi.mock("@/api/chats/hooks/useBulkDeleteChats", () => ({
	default: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
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

	it("should show Delete Chat option for VIEWER (users can delete their own chats)", async () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: false, role: "VIEWER" };
		mockChatsData = [mockChat];

		render(<ChatsPageClient searchSpaceId="1" />);

		const moreButtons = screen.getAllByRole("button", { name: /open menu/i });
		await userEvent.setup().click(moreButtons[0]);

		expect(screen.getByText("Delete Chat")).toBeInTheDocument();
	});

	describe("Bulk delete", () => {
		it("should show Delete Selected button after entering selection mode and selecting chats", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [mockChat, { ...mockChat, id: 2, title: "Chat 2" }];

			const user = userEvent.setup();
			render(<ChatsPageClient searchSpaceId="1" />);

			expect(screen.queryByText("Delete Selected")).not.toBeInTheDocument();

			const selectButton = screen.getByRole("button", { name: /select/i });
			await user.click(selectButton);

			const chatCards = screen.getAllByText("Test Chat");
			await user.click(chatCards[0]);

			expect(screen.getByText("Delete Selected")).toBeInTheDocument();
		});
	});

	describe("Type filter - Non-favorites", () => {
		const favoriteChat = {
			id: 1,
			title: "Favorite Chat",
			type: "QNA",
			created_at: new Date().toISOString(),
			search_space_id: 1,
			is_favorite: true,
		};

		const nonFavoriteChat = {
			id: 2,
			title: "Regular Chat",
			type: "QNA",
			created_at: new Date().toISOString(),
			search_space_id: 1,
			is_favorite: false,
		};

		it("should render the Non-favorites filter option in the type dropdown", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [favoriteChat, nonFavoriteChat];

			render(<ChatsPageClient searchSpaceId="1" />);

			const filterTriggers = screen.getAllByRole("combobox");
			await userEvent.setup().click(filterTriggers[0]);

			expect(screen.getByText("Non-favorites")).toBeInTheDocument();
		});

		it("should show both favorite and non-favorite chats by default (All Types)", () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [favoriteChat, nonFavoriteChat];

			render(<ChatsPageClient searchSpaceId="1" />);

			expect(screen.getByText("Favorite Chat")).toBeInTheDocument();
			expect(screen.getByText("Regular Chat")).toBeInTheDocument();
		});

		it("should show only favorited chats when Favorites filter is selected", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [favoriteChat, nonFavoriteChat];

			const { container } = render(<ChatsPageClient searchSpaceId="1" />);

			const filterTriggers = screen.getAllByRole("combobox");
			await userEvent.setup().click(filterTriggers[0]);
			await userEvent.setup().click(screen.getByText("Favorites"));

			expect(screen.getByText("Favorite Chat")).toBeInTheDocument();
			expect(screen.queryByText("Regular Chat")).not.toBeInTheDocument();
		});

		it("should show only non-favorited chats when Non-favorites filter is selected", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [favoriteChat, nonFavoriteChat];

			const { container } = render(<ChatsPageClient searchSpaceId="1" />);

			const filterTriggers = screen.getAllByRole("combobox");
			await userEvent.setup().click(filterTriggers[0]);
			await userEvent.setup().click(screen.getByText("Non-favorites"));

			expect(screen.queryByText("Favorite Chat")).not.toBeInTheDocument();
			expect(screen.getByText("Regular Chat")).toBeInTheDocument();
		});

		it("should handle chats with undefined is_favorite as non-favorites", async () => {
			const undefinedFavChat = {
				id: 3,
				title: "Undefined Fav Chat",
				type: "QNA",
				created_at: new Date().toISOString(),
				search_space_id: 1,
			};

			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };
			mockChatsData = [favoriteChat, undefinedFavChat];

			const { container } = render(<ChatsPageClient searchSpaceId="1" />);

			const filterTriggers = screen.getAllByRole("combobox");
			await userEvent.setup().click(filterTriggers[0]);
			await userEvent.setup().click(screen.getByText("Non-favorites"));

			expect(screen.queryByText("Favorite Chat")).not.toBeInTheDocument();
			expect(screen.getByText("Undefined Fav Chat")).toBeInTheDocument();
		});
	});
});
