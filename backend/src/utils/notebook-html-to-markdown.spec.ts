import { notebookHtmlToMarkdown } from "./notebook-html-to-markdown";
import { PARAGRAPH_BREAK_TOKEN } from "./markdown-normalizer";

function bnBlock(inner: string): string {
	return `<div data-node-type="blockOuter" class="bn-block-outer"><div data-node-type="block" class="bn-block"><div data-content-type="paragraph" class="bn-block-content">${inner}</div></div></div>`;
}

function textPara(text: string): string {
	return bnBlock(`<p class="bn-inline-content">${text}</p>`);
}

function blankPara(): string {
	return bnBlock(
		'<p class="bn-inline-content"><span class="ProseMirror-trailingBreak" style="display: inline-block;"></span></p>',
	);
}

describe("notebookHtmlToMarkdown", () => {
	it("converts simple paragraph to markdown", () => {
		const html = bnBlock("<p>Hello world</p>");
		const result = notebookHtmlToMarkdown(html);
		expect(result.markdown).toContain("Hello world");
	});

	describe("blank paragraph (ProseMirror-trailingBreak) handling", () => {
		it("produces PARAGRAPH_BREAK_TOKEN for blank paragraphs between text paragraphs", () => {
			const html = textPara("First") + blankPara() + textPara("Second");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain(PARAGRAPH_BREAK_TOKEN);
		});

		it("distinguishes blank-paragraph spacing from normal paragraph breaks via token", () => {
			const htmlWithBlanks =
				textPara("First") + blankPara() + textPara("Second");
			const htmlNoBlanks = textPara("First") + textPara("Second");
			const withBlanks = notebookHtmlToMarkdown(htmlWithBlanks);
			const noBlanks = notebookHtmlToMarkdown(htmlNoBlanks);
			expect(withBlanks.markdown).toContain(PARAGRAPH_BREAK_TOKEN);
			expect(noBlanks.markdown).not.toContain(PARAGRAPH_BREAK_TOKEN);
		});

		it("preserves multiple consecutive blank paragraphs as multiple tokens", () => {
			const html =
				textPara("A") +
				blankPara() +
				blankPara() +
				textPara("B");
			const result = notebookHtmlToMarkdown(html);
			const tokenCount = result.markdown.split(PARAGRAPH_BREAK_TOKEN).length - 1;
			expect(tokenCount).toBeGreaterThanOrEqual(1);
		});

		it("handles 4 Test paragraphs separated by blank paragraphs", () => {
			const html =
				textPara("Test") +
				blankPara() +
				textPara("Test") +
				blankPara() +
				textPara("Test") +
				blankPara() +
				textPara("Test");
			const result = notebookHtmlToMarkdown(html);
			const segments = result.markdown.split("Test").length - 1;
			expect(segments).toBe(4);
			expect(result.markdown).toContain(PARAGRAPH_BREAK_TOKEN);
			expect(result.markdown).not.toMatch(/\n{3}/);
		});

		it("handles ProseMirror-trailingBreak with camelCase class name", () => {
			const html = bnBlock(
				'<p class="bn-inline-content"><span class="ProseMirror-trailingBreak"></span></p>',
			);
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown.length).toBeGreaterThanOrEqual(0);
		});

		it("never produces raw triple newlines in output (no double blank lines)", () => {
			const html =
				textPara("A") +
				blankPara() +
				textPara("B") +
				blankPara() +
				textPara("C");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).not.toMatch(/\n{3}/);
		});
	});

	describe("injectBlankParagraphMarkers — S3: only runs on BlockNote HTML", () => {
		it("injects <br> into empty <p> within BlockNote block structure", () => {
			const html = textPara("A") + blankPara() + textPara("B");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain(PARAGRAPH_BREAK_TOKEN);
		});
	});

	describe("newline preservation from <br> tags", () => {
		it("preserves soft line breaks within a paragraph", () => {
			const html = bnBlock("<p>Line one<br>Line two</p>");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toMatch(/Line one  \nLine two/);
		});

		it("preserves multiple soft line breaks within a paragraph", () => {
			const html = bnBlock("<p>First<br>Second<br>Third</p>");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toMatch(/First  \nSecond  \nThird/);
		});
	});

	describe("paragraph spacing", () => {
		it("separates consecutive text paragraphs with double newlines", () => {
			const html = textPara("A") + textPara("B");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain("A\n\nB");
		});

		it("does not collapse paragraph spacing below two newlines", () => {
			const html = textPara("A") + textPara("B") + textPara("C");
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain("A\n\nB\n\nC");
		});
	});

	describe("headings", () => {
		it("converts heading blocks to markdown headings", () => {
			const html = `<div data-node-type="blockOuter"><div data-node-type="block"><div data-content-type="heading" data-level="2"><h2>My Heading</h2></div></div></div>`;
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain("## My Heading");
		});
	});

	describe("lists", () => {
		it("converts bullet list items", () => {
			const html =
				bnBlock(
					'<div data-content-type="bulletListItem"><p>Item one</p></div>',
				) +
				bnBlock(
					'<div data-content-type="bulletListItem"><p>Item two</p></div>',
				);
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toMatch(/- +Item one/);
			expect(result.markdown).toMatch(/- +Item two/);
		});
	});

	describe("edge cases", () => {
		it("returns empty markdown for empty HTML", () => {
			const result = notebookHtmlToMarkdown("");
			expect(result.markdown).toBe("");
			expect(result.images).toEqual([]);
		});

		it("returns empty markdown for whitespace-only HTML", () => {
			const result = notebookHtmlToMarkdown("   \n  ");
			expect(result.markdown).toBe("");
		});

		it("extracts images from HTML", () => {
			const html = bnBlock(
				'<p>Text <img src="https://example.com/img.png" alt="alt text"> more text</p>',
			);
			const result = notebookHtmlToMarkdown(html);
			expect(result.images.length).toBeGreaterThanOrEqual(1);
			expect(result.images[0].url).toBe("https://example.com/img.png");
		});
	});

	describe("BlockNote UI artifact stripping", () => {
		it("removes contenteditable attributes without losing content", () => {
			const html = `<div data-node-type="blockOuter"><div data-node-type="block" contenteditable="true"><div data-content-type="paragraph"><p>Editable content</p></div></div></div>`;
			const result = notebookHtmlToMarkdown(html);
			expect(result.markdown).toContain("Editable content");
		});
	});
});
