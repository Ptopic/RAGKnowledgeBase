import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/api/searchspaces/hooks/useGetSearchSpace", () => ({
	default: () => ({
		data: mockSearchSpaceData,
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/api/users/hooks/useGetCurrentUser", () => ({
	default: () => ({
		data: mockCurrentUser,
		isLoading: false,
		error: null,
	}),
}));

let mockSearchSpaceData: any = null;
let mockCurrentUser: any = { isSuperuser: false };
let capturedTemplateProps: any = null;

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
	QueryTemplateManager: (props: any) => {
		capturedTemplateProps = props;
		return <div>QueryTemplateManager</div>;
	},
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
	beforeEach(() => {
		mockCurrentUser = { isSuperuser: false };
	});

	it("should show all tabs for OWNER who is superuser", () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: true };
		mockCurrentUser = { isSuperuser: true };

		render(<SettingsPage />);

		expect(screen.getAllByText("Model Configs").length).toBeGreaterThan(0);
		expect(screen.getAllByText("LLM Roles").length).toBeGreaterThan(0);
		expect(screen.getAllByText("API Keys").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
	});

	it("should hide API Keys tab for OWNER who is not superuser", () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: true };
		mockCurrentUser = { isSuperuser: false };

		render(<SettingsPage />);

		expect(screen.getAllByText("Model Configs").length).toBeGreaterThan(0);
		expect(screen.getAllByText("LLM Roles").length).toBeGreaterThan(0);
		expect(screen.queryAllByText("API Keys")).toHaveLength(0);
		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
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

	it("should hide API Keys tab for superuser who is not owner", () => {
		mockSearchSpaceData = { id: 1, name: "Test", is_owner: false };
		mockCurrentUser = { isSuperuser: true };

		render(<SettingsPage />);

		expect(screen.queryAllByText("Model Configs")).toHaveLength(0);
		expect(screen.queryAllByText("LLM Roles")).toHaveLength(0);
		expect(screen.queryAllByText("API Keys")).toHaveLength(0);
	});

	it("should show only shared tabs when search space data is not loaded", () => {
		mockSearchSpaceData = null;

		render(<SettingsPage />);

		expect(screen.queryAllByText("Model Configs")).toHaveLength(0);
		expect(screen.getAllByText("Query Templates").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
	});

	describe("Template permission gating via canModify prop", () => {
		beforeEach(() => {
			capturedTemplateProps = null;
		});

		it("should pass canModify=true for OWNER", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: true, role: "OWNER" };

			render(<SettingsPage />);

			const templateTab = screen.getAllByText(/Query Templates|Templates/).find((el) => el.closest('[role="tab"]'));
			if (templateTab) await userEvent.setup().click(templateTab);

			expect(capturedTemplateProps).not.toBeNull();
			expect(capturedTemplateProps.canModify).toBe(true);
		});

		it("should pass canModify=true for EDITOR", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: false, role: "EDITOR" };

			render(<SettingsPage />);

			expect(capturedTemplateProps).not.toBeNull();
			expect(capturedTemplateProps.canModify).toBe(true);
		});

		it("should pass canModify=false for VIEWER", async () => {
			mockSearchSpaceData = { id: 1, name: "Test", is_owner: false, role: "VIEWER" };

			render(<SettingsPage />);

			expect(capturedTemplateProps).not.toBeNull();
			expect(capturedTemplateProps.canModify).toBe(false);
		});
	});
});
