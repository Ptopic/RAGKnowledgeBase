import { describe, expect, it } from "vitest";

import { isSafeRedirect, resolveRedirectPath } from "./AuthPage.utils";

describe("isSafeRedirect", () => {
	it("allows relative internal paths", () => {
		expect(isSafeRedirect("/dashboard")).toBe(true);
		expect(isSafeRedirect("/invite?token=abc123")).toBe(true);
		expect(isSafeRedirect("/s/some-slug")).toBe(true);
	});

	it("rejects protocol-relative URLs", () => {
		expect(isSafeRedirect("//evil.com")).toBe(false);
		expect(isSafeRedirect("//evil.com/steal")).toBe(false);
	});

	it("rejects absolute URLs", () => {
		expect(isSafeRedirect("https://evil.com")).toBe(false);
		expect(isSafeRedirect("http://evil.com")).toBe(false);
	});

	it("rejects non-path URLs", () => {
		expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
		expect(isSafeRedirect("data:text/html,<script>")).toBe(false);
	});
});

describe("resolveRedirectPath", () => {
	it("returns redirect param when valid and whitelisted", () => {
		const params = new URLSearchParams("redirect=/invite?token=abc123");
		expect(resolveRedirectPath(params)).toBe("/invite?token=abc123");
	});

	it("returns /dashboard for whitelisted dashboard redirect", () => {
		const params = new URLSearchParams("redirect=/dashboard");
		expect(resolveRedirectPath(params)).toBe("/dashboard");
	});

	it("returns /dashboard when redirect param is missing", () => {
		const params = new URLSearchParams();
		expect(resolveRedirectPath(params)).toBe("/dashboard");
	});

	it("returns /dashboard for non-whitelisted paths", () => {
		const params = new URLSearchParams("redirect=/admin");
		expect(resolveRedirectPath(params)).toBe("/dashboard");
	});

	it("returns /dashboard for external URLs (open-redirect protection)", () => {
		const params = new URLSearchParams("redirect=https://evil.com");
		expect(resolveRedirectPath(params)).toBe("/dashboard");
	});

	it("returns /dashboard for protocol-relative URLs", () => {
		const params = new URLSearchParams("redirect=//evil.com");
		expect(resolveRedirectPath(params)).toBe("/dashboard");
	});
});
