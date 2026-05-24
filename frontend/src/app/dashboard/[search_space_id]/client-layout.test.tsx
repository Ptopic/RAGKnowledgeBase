import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

let mockSearchSpaceData: { role: string; is_owner: boolean } | null = null;
let mockPathname = "/dashboard/1/researcher";

vi.mock("@/api/searchspaces/hooks/useGetSearchSpace", () => ({
	default: () => ({
		data: mockSearchSpaceData,
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/hooks/use-llm-configs", () => ({
	useLLMPreferences: () => ({
		loading: false,
		error: null,
		isOnboardingComplete: () => true,
	}),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/sidebar/AppSidebarProvider", () => ({
	AppSidebarProvider: ({ navMain }: { navMain: { title: string; items: { title: string; url: string }[] }[] }) => (
		<div data-testid="sidebar">
			{navMain.map((group) => (
				<div key={group.title} data-testid={`nav-group-${group.title}`}>
					<span>{group.title}</span>
					{group.items?.map((item) => (
						<div key={item.url} data-testid={`nav-item-${item.title}`}>
							{item.title}
						</div>
					))}
				</div>
			))}
		</div>
	),
}));

vi.mock("@/components/dashboard-breadcrumb", () => ({
	DashboardBreadcrumb: () => <div>Breadcrumb</div>,
}));

vi.mock("@/components/theme/theme-toggle", () => ({
	ThemeTogglerComponent: () => <div>Theme</div>,
}));

vi.mock("@/components/no-access-page", () => ({
	NoAccessPage: () => <div>NoAccess</div>,
}));

vi.mock("@/components/access-denied-page", () => ({
	AccessDeniedPage: () => <div data-testid="access-denied">AccessDenied</div>,
}));

import { DashboardClientLayout } from "./client-layout";

const baseNavMain = [
	{
		title: "Researcher",
		url: "/dashboard/1/researcher",
		icon: "SquareTerminal",
		items: [],
	},
	{
		title: "Documents",
		url: "#",
		icon: "FileStack",
		items: [
			{ title: "Upload Documents", url: "/dashboard/1/documents/upload" },
			{ title: "Add Webpages", url: "/dashboard/1/documents/webpage" },
			{ title: "Add Youtube Videos", url: "/dashboard/1/documents/youtube" },
			{ title: "Manage Documents", url: "/dashboard/1/documents" },
			{ title: "Create Notebook", url: "/dashboard/1/notebooks/create" },
			{ title: "Manage Notebooks", url: "/dashboard/1/notebooks" },
		],
	},
	{
		title: "Connectors",
		url: "#",
		icon: "Plug",
		items: [
			{ title: "Add Connector", url: "/dashboard/1/connectors/add" },
			{ title: "Manage Connectors", url: "/dashboard/1/connectors" },
		],
	},
];

const baseNavSecondary = [
	{ title: "All Search Spaces", url: "#", icon: "Info" },
	{ title: "All Search Spaces", url: "/dashboard", icon: "Undo2" },
];

describe("DashboardClientLayout sidebar filtering", () => {
	it("shows all Documents items for OWNER", () => {
		mockSearchSpaceData = { role: "OWNER", is_owner: true };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("nav-item-Upload Documents")).toBeDefined();
		expect(screen.getByTestId("nav-item-Add Webpages")).toBeDefined();
		expect(screen.getByTestId("nav-item-Add Youtube Videos")).toBeDefined();
		expect(screen.getByTestId("nav-item-Manage Documents")).toBeDefined();
		expect(screen.getByTestId("nav-item-Create Notebook")).toBeDefined();
		expect(screen.getByTestId("nav-item-Manage Notebooks")).toBeDefined();
	});

	it("shows all Documents items for EDITOR", () => {
		mockSearchSpaceData = { role: "EDITOR", is_owner: false };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("nav-item-Upload Documents")).toBeDefined();
		expect(screen.getByTestId("nav-item-Add Webpages")).toBeDefined();
		expect(screen.getByTestId("nav-item-Add Youtube Videos")).toBeDefined();
		expect(screen.getByTestId("nav-item-Create Notebook")).toBeDefined();
	});

	it("filters restricted items for VIEWER who is not owner", () => {
		mockSearchSpaceData = { role: "VIEWER", is_owner: false };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.queryByTestId("nav-item-Upload Documents")).toBeNull();
		expect(screen.queryByTestId("nav-item-Add Webpages")).toBeNull();
		expect(screen.queryByTestId("nav-item-Add Youtube Videos")).toBeNull();
		expect(screen.queryByTestId("nav-item-Create Notebook")).toBeNull();
		expect(screen.getByTestId("nav-item-Manage Documents")).toBeDefined();
		expect(screen.getByTestId("nav-item-Manage Notebooks")).toBeDefined();
	});

	it("shows all items for VIEWER who is owner", () => {
		mockSearchSpaceData = { role: "VIEWER", is_owner: true };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("nav-item-Upload Documents")).toBeDefined();
		expect(screen.getByTestId("nav-item-Create Notebook")).toBeDefined();
	});
});

describe("DashboardClientLayout Connectors sidebar filtering", () => {
	beforeEach(() => {
		mockPathname = "/dashboard/1/researcher";
	});

	it("hides Connectors group for VIEWER", () => {
		mockSearchSpaceData = { role: "VIEWER", is_owner: false };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.queryByTestId("nav-group-Connectors")).toBeNull();
	});

	it("shows Connectors group for EDITOR", () => {
		mockSearchSpaceData = { role: "EDITOR", is_owner: false };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("nav-group-Connectors")).toBeDefined();
	});

	it("shows Connectors group for OWNER", () => {
		mockSearchSpaceData = { role: "OWNER", is_owner: true };

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("nav-group-Connectors")).toBeDefined();
	});
});

describe("DashboardClientLayout Connectors route guard", () => {
	beforeEach(() => {
		mockSearchSpaceData = { role: "VIEWER", is_owner: false };
	});

	it("shows AccessDeniedPage for VIEWER on /connectors", () => {
		mockPathname = "/dashboard/1/connectors";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("access-denied")).toBeDefined();
	});

	it("shows AccessDeniedPage for VIEWER on /connectors/add", () => {
		mockPathname = "/dashboard/1/connectors/add";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("access-denied")).toBeDefined();
	});

	it("shows AccessDeniedPage for VIEWER on /connectors/add/slack-connector", () => {
		mockPathname = "/dashboard/1/connectors/add/slack-connector";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("access-denied")).toBeDefined();
	});

	it("shows AccessDeniedPage for VIEWER on /connectors/5", () => {
		mockPathname = "/dashboard/1/connectors/5";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("access-denied")).toBeDefined();
	});

	it("shows AccessDeniedPage for VIEWER on /connectors/5/edit", () => {
		mockPathname = "/dashboard/1/connectors/5/edit";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.getByTestId("access-denied")).toBeDefined();
	});

	it("does NOT show AccessDeniedPage for EDITOR on /connectors", () => {
		mockSearchSpaceData = { role: "EDITOR", is_owner: false };
		mockPathname = "/dashboard/1/connectors";

		render(
			<DashboardClientLayout
				searchSpaceId="1"
				navSecondary={baseNavSecondary}
				navMain={baseNavMain}
			>
				<div>Content</div>
			</DashboardClientLayout>,
		);

		expect(screen.queryByTestId("access-denied")).toBeNull();
	});
});
