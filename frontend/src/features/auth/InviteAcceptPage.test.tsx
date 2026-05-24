import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

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
	useSearchParams: vi.fn(),
}));

describe("InviteAcceptPage", () => {
	it("renders invalid state when no token", () => {
		vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as unknown as ReadonlyURLSearchParams);
		render(<InviteAcceptPage />);
		expect(screen.getByRole("heading", { name: /invalid/i })).toBeInTheDocument();
	});

	it("renders invitation not found when token present but invitation missing", () => {
		vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("token=test-token") as unknown as ReadonlyURLSearchParams);
		render(<InviteAcceptPage />);
		expect(screen.getByText(/not found/i)).toBeInTheDocument();
	});
});
