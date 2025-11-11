import { Injectable } from "@nestjs/common";

export interface TerminalMessage {
	id: number;
	text: string;
	type: string;
}

export interface SourceNode {
	id: string;
	text: string;
	url: string;
	metadata: {
		title: string;
		source_type: string;
		group_name: string;
	};
}

export interface SourceGroup {
	id: number;
	name: string;
	type: string;
	sources: Array<{
		id: number | string;
		title: string;
		description: string;
		url: string;
	}>;
}

@Injectable()
export class StreamingService {
	private terminalIdx = 1;
	private messageAnnotations = [
		{ type: "TERMINAL_INFO", content: [] },
		{ type: "SOURCES", content: [] },
		{ type: "ANSWER", content: [] },
		{ type: "FURTHER_QUESTIONS", content: [] },
	];

	resetState() {
		this.terminalIdx = 1;
		this.messageAnnotations = [
			{ type: "TERMINAL_INFO", content: [] },
			{ type: "SOURCES", content: [] },
			{ type: "ANSWER", content: [] },
			{ type: "FURTHER_QUESTIONS", content: [] },
		];
	}

	formatTerminalInfoDelta(text: string, messageType = "info"): string {
		try {
			const message: TerminalMessage = {
				id: this.terminalIdx++,
				text,
				type: messageType,
			};

			this.messageAnnotations[0].content.push(message);

			const annotation = { type: "TERMINAL_INFO", data: message };
			const serialized = JSON.stringify([annotation]);
			return `8:${serialized}\n`;
		} catch (error) {
			console.error(
				`[StreamingService] Error formatting terminal info: ${error.message}`,
				{ text, messageType },
			);
			// Return a safe fallback that won't break the stream
			return `8:${JSON.stringify([{ type: "TERMINAL_INFO", data: { id: this.terminalIdx++, text: "Processing...", type: "info" } }])}\n`;
		}
	}

	formatSourcesDelta(sources: SourceGroup[]): string {
		try {
			this.messageAnnotations[1].content = sources as any;

			const nodes: SourceNode[] = [];

			for (const group of sources) {
				for (const source of group.sources || []) {
					nodes.push({
						id: String(source.id || ""),
						text: (source.description || "").trim(),
						url: source.url || "",
						metadata: {
							title: source.title || "",
							source_type: group.type || "",
							group_name: group.name || "",
						},
					});
				}
			}

			const annotation = { type: "sources", data: { nodes } };
			const serialized = JSON.stringify([annotation]);
			return `8:${serialized}\n`;
		} catch (error) {
			console.error(
				`[StreamingService] Error formatting sources: ${error.message}`,
			);
			return `8:${JSON.stringify([{ type: "sources", data: { nodes: [] } }])}\n`;
		}
	}

	formatAnswerDelta(answerChunk: string): string {
		if (Array.isArray(this.messageAnnotations[2].content)) {
			this.messageAnnotations[2].content.push(answerChunk);
		} else {
			this.messageAnnotations[2].content = [answerChunk] as any;
		}

		const annotation = { type: "ANSWER", content: [answerChunk] };
		return `8:${JSON.stringify([annotation])}\n`;
	}

	formatFurtherQuestionsDelta(
		furtherQuestions: Array<{ id: number; question: string }>,
	): string {
		this.messageAnnotations[3].content = furtherQuestions as any;

		const annotation = {
			type: "FURTHER_QUESTIONS",
			data: furtherQuestions
				.filter((q) => q.question && q.question.trim() !== "")
				.map((q) => q.question),
		};
		return `8:${JSON.stringify([annotation])}\n`;
	}

	formatTextChunk(text: string): string {
		return `0:${JSON.stringify(text)}\n`;
	}

	formatError(errorMessage: string): string {
		return `3:${JSON.stringify(errorMessage)}\n`;
	}

	formatCompletion(promptTokens = 156, completionTokens = 204): string {
		const totalTokens = promptTokens + completionTokens;
		const completionData = {
			finishReason: "stop",
			usage: {
				promptTokens,
				completionTokens,
				totalTokens,
			},
		};
		return `d:${JSON.stringify(completionData)}\n`;
	}
}
