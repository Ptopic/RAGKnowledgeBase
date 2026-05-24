import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/api/searchspaces/hooks/useGetSearchSpace", () => ({
	default: () => ({
		data: mockSearchSpaceData,
		isLoading: false,
		error: null,
	}),
}));

let mockSearchSpaceData: any = null;

vi.mock("@/components/settings/model-config-manager", () => ({
	ModelConfigManager: () => <div>ModelConfigManager</div>,
}));
vi.mock("@/components/settings/llm-role-manager", () => ({
	LLMRoleManager: () => <div>LLMRoleManager</div>,
}));
vi.mock("@/components/settings/api-keys-manager", () => ({
	ApiKeysManager: () => <div>ApiKeysManager</div>,
}));
vi.mock("@/components/settings/query-template-manager", () => ({
	QueryTemplateManager: () => <div>QueryTemplateManager</div>,
}));
vi.mock("@/components/settings/members-manager", () => ({
	MembersManager: () => <div>MembersManager</div>,
}));
vi.mock("next/navigation", () => ({
	useParams: () => ({ search_space_id: "1" }),
	useRouter: () => ({ push: vi.fn() }),
}));

import SettingsPage from "./page";

describe("SettingsPage", () => {
	it("should show all tabs for OWNER", () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: true };

		render(<SettingsPage />);

		expect(screen.getAllByText("Model Configs").length).toBeGreaterThan(0);
		expect(screen.getAllByText("LLM Roles").length).toBeGreaterThan(0);
		expect(screen.getAllByText("API Keys").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
	});

	it("should hide Models, Roles, and Keys tabs for non-OWNER", () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: false };

		render(<SettingsPage />);

		expect(screen.queryAllByText("Model Configs")).toHaveLength(0);
		expect(screen.queryAllByText("LLM Roles")).toHaveLength(0);
		expect(screen.queryAllByText("API Keys")).toHaveLength(0);

		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
	});

	it("should show only shared tabs when search space data is not loaded", () => {
		mockSearchSpaceData = null;

		render(<SettingsPage />);

		expect(screen.queryAllByText("Model Configs")).toHaveLength(0);
		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
	});
});
