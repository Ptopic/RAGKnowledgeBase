import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Build a tool that lets the agent convert natural-language or
 * locale-specific date expressions into a structured `{start, end}` ISO
 * window. The agent invokes this when the user's question is time-scoped
 * (calendar, scheduling, recency) and then forwards the result to
 * `search_knowledge_base` via the `date_start` / `date_end` parameters.
 *
 * Letting the LLM do the date reasoning (rather than a brittle regex
 * pre-parse) handles the long tail of formats — "2.6", "june 2",
 * "yesterday", "last week", "from 25.11 to 28.11", etc. — and
 * disambiguates month/day order per locale.
 */
export function createParseDateRangeTool() {
	return new DynamicStructuredTool({
		name: "parse_date_range",
		description: `
Parse natural language date expressions and specific dates in ANY format into ISO date strings.

Current date: ${new Date().toISOString().split("T")[0]}

You MUST convert the date expression to ISO format (YYYY-MM-DD) dates.

SUPPORTED FORMATS:
- Natural language: 'last week', 'yesterday', 'next month', 'today', 'this week', 'last 7 days'
- ISO dates: '2025-01-01', '2025/01/01'
- Dot format: '25.11.2025' (DD.MM.YYYY) → convert to '2025-11-25'
- Slash format: '11/25/2025' (MM/DD/YYYY) → convert to '2025-11-25'
- Written dates: 'Jan 1, 2025', 'January 1, 2025', '1st Jan 2025', 'November 25, 2025'
- Relative: 'on 25.11.2025', 'posted on January 1', 'from November 25'
- Ranges: 'from X to Y', 'between X and Y', 'X to Y'

CONVERSION RULES:
- Single date (e.g., "25.11.2025", "yesterday"): set both start and end to that date
- Date range (e.g., "last week", "from X to Y"): set start to beginning, end to end of range
- "last week": start = 7 days ago, end = yesterday
- "yesterday": start = end = yesterday's date
- "today": start = end = today's date
- "this week": start = beginning of current week (Monday), end = today

EXAMPLES:
Input: "Find articles posted on 25.11.2025"
Output: start: "2025-11-25", end: "2025-11-25"

Input: "Show news from November 25, 2025"
Output: start: "2025-11-25", end: "2025-11-25"

Input: "Find articles from last week"
Output: start: "2025-11-25", end: "2025-12-01"

Input: "Articles from 01.12.2025 to 05.12.2025"
Output: start: "2025-12-01", end: "2025-12-05"

If you cannot parse the date, return start: null, end: null
`,
		schema: z.object({
			start: z
				.string()
				.nullable()
				.describe(
					"Start date in ISO format (YYYY-MM-DD). For single dates, this equals the end date.",
				),
			end: z
				.string()
				.nullable()
				.describe(
					"End date in ISO format (YYYY-MM-DD). For single dates, this equals the start date.",
				),
		}),
		func: async ({ start, end }) => {
			// The LLM is the source of truth here. We just round-trip its
			// output so the agent sees the structured result alongside the
			// conversation. The downstream `search_knowledge_base` tool
			// expects ISO YYYY-MM-DD strings; if the model returned something
			// else (e.g. full ISO with time), coerce to the date portion.
			const normalize = (value: string | null | undefined): string | null => {
				if (typeof value !== "string" || !value) return null;
				// Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss..." or "YYYY-MM-DD HH:mm:ss".
				const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
				return match ? match[1] : value;
			};
			return JSON.stringify({
				start: normalize(start),
				end: normalize(end),
			});
		},
	});
}
