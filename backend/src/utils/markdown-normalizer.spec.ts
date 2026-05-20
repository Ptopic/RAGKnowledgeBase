import {
	normalizeMarkdownForChunking,
	injectParagraphBreakTokens,
	normalizeChunkAfterSplit,
	PARAGRAPH_BREAK_TOKEN,
} from "./markdown-normalizer";

describe("PARAGRAPH_BREAK_TOKEN", () => {
	it("is {PB} — distinctive, non-colliding with natural content", () => {
		expect(PARAGRAPH_BREAK_TOKEN).toBe("{PB}");
		expect(PARAGRAPH_BREAK_TOKEN.length).toBe(4);
	});
});

describe("normalizeMarkdownForChunking", () => {
	it("returns empty string for empty input", () => {
		expect(normalizeMarkdownForChunking("")).toBe("");
	});

	it("normalizes CRLF to LF", () => {
		expect(normalizeMarkdownForChunking("line one\r\nline two")).toBe(
			"line one\nline two",
		);
	});

	it("trims leading and trailing whitespace from the whole string", () => {
		expect(normalizeMarkdownForChunking("  hello  ")).toBe("hello");
	});

	describe("markdown line break preservation (two trailing spaces)", () => {
		it("preserves two trailing spaces (markdown hard line break)", () => {
			const input = "Line one  \nLine two";
			expect(normalizeMarkdownForChunking(input)).toBe("Line one  \nLine two");
		});

		it("strips single trailing space from lines", () => {
			const input = "Line one \nLine two";
			expect(normalizeMarkdownForChunking(input)).toBe("Line one\nLine two");
		});

		it("reduces 3+ trailing spaces to exactly 2", () => {
			const input = "Line one     \nLine two";
			expect(normalizeMarkdownForChunking(input)).toBe("Line one  \nLine two");
		});
	});

	describe("paragraph break handling — generic (no token injection)", () => {
		it("preserves double newlines (standard paragraph break)", () => {
			const input = "Paragraph one\n\nParagraph two";
			expect(normalizeMarkdownForChunking(input)).toBe(
				"Paragraph one\n\nParagraph two",
			);
		});

		it("collapses triple newlines to double (no token for generic content)", () => {
			const input = "Paragraph one\n\n\nParagraph two";
			expect(normalizeMarkdownForChunking(input)).toBe(
				"Paragraph one\n\nParagraph two",
			);
		});

		it("collapses 4+ consecutive newlines to double", () => {
			const input = "A\n\n\n\nB";
			expect(normalizeMarkdownForChunking(input)).toBe("A\n\nB");
		});

		it("never injects PARAGRAPH_BREAK_TOKEN", () => {
			const inputs = [
				"A\n\n\nB",
				"A\n\n\n\nB",
				"A\n\n\n\n\nB",
				"A\n\n   \n\nB",
			];
			for (const input of inputs) {
				const result = normalizeMarkdownForChunking(input);
				expect(result).not.toContain(PARAGRAPH_BREAK_TOKEN);
			}
		});

		it("normalizes whitespace-only lines to blank lines", () => {
			const input = "A\n   \nB";
			expect(normalizeMarkdownForChunking(input)).toBe("A\n\nB");
		});
	});
});

describe("injectParagraphBreakTokens", () => {
	it("converts triple newlines to paragraph break + token", () => {
		const input = "Paragraph one\n\n\nParagraph two";
		expect(injectParagraphBreakTokens(input)).toBe(
			"Paragraph one\n\n" + PARAGRAPH_BREAK_TOKEN + "Paragraph two",
		);
	});

	it("converts 4+ consecutive newlines to paragraph break + token", () => {
		const input = "A\n\n\n\nB";
		expect(injectParagraphBreakTokens(input)).toBe(
			"A\n\n" + PARAGRAPH_BREAK_TOKEN + "B",
		);
	});

	it("preserves multiple blank-paragraph separators as tokens", () => {
		const input = "A\n\n\nB\n\n\nC";
		expect(injectParagraphBreakTokens(input)).toBe(
			"A\n\n" + PARAGRAPH_BREAK_TOKEN + "B\n\n" + PARAGRAPH_BREAK_TOKEN + "C",
		);
	});

	it("does not modify double newlines (standard paragraph breaks)", () => {
		const input = "A\n\nB\n\nC";
		expect(injectParagraphBreakTokens(input)).toBe("A\n\nB\n\nC");
	});

	describe("concrete fixture: repeated Test paragraphs", () => {
		it("encodes blank-line separation between Test paragraphs as tokens", () => {
			const input = "Test\n\n\nTest\n\n\nTest\n\n\nTest";
			const result = injectParagraphBreakTokens(input);
			expect(result).toBe(
				"Test\n\n" + PARAGRAPH_BREAK_TOKEN + "Test\n\n" + PARAGRAPH_BREAK_TOKEN + "Test\n\n" + PARAGRAPH_BREAK_TOKEN + "Test",
			);
		});

		it("does not modify standard paragraph separation", () => {
			const input = "Test\n\nTest\n\nTest\n\nTest";
			expect(injectParagraphBreakTokens(input)).toBe("Test\n\nTest\n\nTest\n\nTest");
		});
	});
});

describe("normalizeChunkAfterSplit", () => {
	it("returns empty string for empty input", () => {
		expect(normalizeChunkAfterSplit("")).toBe("");
	});

	it("preserves markdown hard-line-break (two trailing spaces) within content", () => {
		expect(normalizeChunkAfterSplit("Line one  \nLine two")).toBe("Line one  \nLine two");
	});

	it("normalizes CRLF to LF", () => {
		expect(normalizeChunkAfterSplit("line one\r\nline two")).toBe(
			"line one\nline two",
		);
	});

	it("does NOT collapse triple newlines (preserves already-injected tokens)", () => {
		const chunk = "First\n\n" + PARAGRAPH_BREAK_TOKEN + "Second";
		expect(normalizeChunkAfterSplit(chunk)).toBe(chunk);
	});

	it("does NOT inject tokens (only trims whitespace)", () => {
		const input = "A\n\n\nB";
		expect(normalizeChunkAfterSplit(input)).toBe("A\n\n\nB");
	});

	it("trims leading and trailing whitespace from the whole string", () => {
		expect(normalizeChunkAfterSplit("  hello  ")).toBe("hello");
	});
});
