import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import InviteAcceptPage from "./InviteAcceptPage";

vi.mock("@/api/searchspaces/hooks/useGetInvitationByToken", () => ({
	default: () => ({
		data: null,
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/api/searchspaces/hooks/useAcceptInvitation", () => ({
	default: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

vi.mock("@/api/searchspaces/hooks/useDeclineInvitation", () => ({
	default: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	useSearchParams: () => new URLSearchParams("token=test-token"),
}));

describe("InviteAcceptPage", () => {
	it("renders invalid state when no token", () => {
		vi.mocked(vi.fn()).mockReturnValue(new URLSearchParams());
		render(<InviteAcceptPage />);
		expect(screen.getByText(/invalid/i)).toBeInTheDocument();
	});
});
