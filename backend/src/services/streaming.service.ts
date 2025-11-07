import { Injectable } from '@nestjs/common';

interface MessageAnnotation {
	type: string;
	content: any[];
}

interface TerminalMessage {
	id: number;
	text: string;
	type: string;
}

interface SourceNode {
	id: string;
	text: string;
	url: string;
	metadata: {
		title: string;
		source_type: string;
		group_name: string;
	};
}

@Injectable()
export class StreamingService {
	private terminalIdx: number;
	private messageAnnotations: MessageAnnotation[];

	constructor() {
		this.terminalIdx = 1;
		this.messageAnnotations = [
			{ type: 'TERMINAL_INFO', content: [] },
			{ type: 'SOURCES', content: [] },
			{ type: 'ANSWER', content: [] },
			{ type: 'FURTHER_QUESTIONS', content: [] },
		];
	}

	/**
	 * DEPRECATED: This sends the full annotation array every time (inefficient)
	 * Use the delta formatters instead for optimal streaming.
	 */
	private formatAnnotations(): string {
		return `8:${JSON.stringify(this.messageAnnotations)}\n`;
	}

	/**
	 * Format a single terminal info message as a delta annotation
	 */
	formatTerminalInfoDelta(text: string, messageType: string = 'info'): string {
		const message: TerminalMessage = {
			id: this.terminalIdx,
			text,
			type: messageType,
		};
		this.terminalIdx++;

		// Update internal state for reference
		this.messageAnnotations[0].content.push(message);

		// Return only the delta annotation
		const annotation = { type: 'TERMINAL_INFO', data: message };
		return `8:[${JSON.stringify(annotation)}]\n`;
	}

	/**
	 * Format sources as a delta annotation
	 */
	formatSourcesDelta(sources: any[]): string {
		// Update internal state
		this.messageAnnotations[1].content = sources;

		// Return only the delta annotation
		const nodes: SourceNode[] = [];

		for (const group of sources) {
			for (const source of group.sources || []) {
				const node: SourceNode = {
					id: String(source.id || ''),
					text: (source.description || '').trim(),
					url: source.url || '',
					metadata: {
						title: source.title || '',
						source_type: group.type || '',
						group_name: group.name || '',
					},
				};
				nodes.push(node);
			}
		}

		const annotation = { type: 'sources', data: { nodes } };
		return `8:[${JSON.stringify(annotation)}]\n`;
	}

	/**
	 * Format a single answer chunk as a delta annotation
	 */
	formatAnswerDelta(answerChunk: string): string {
		// Update internal state by appending the chunk
		if (Array.isArray(this.messageAnnotations[2].content)) {
			this.messageAnnotations[2].content.push(answerChunk);
		} else {
			this.messageAnnotations[2].content = [answerChunk];
		}

		// Return only the delta annotation with the new chunk
		const annotation = { type: 'ANSWER', content: [answerChunk] };
		return `8:[${JSON.stringify(annotation)}]\n`;
	}

	/**
	 * Format the complete answer as a replacement annotation
	 */
	formatAnswerAnnotation(answerLines: string[]): string {
		// Update internal state
		this.messageAnnotations[2].content = answerLines;

		// Return the full answer annotation
		const annotation = { type: 'ANSWER', content: answerLines };
		return `8:[${JSON.stringify(annotation)}]\n`;
	}

	/**
	 * Format further questions as a delta annotation
	 */
	formatFurtherQuestionsDelta(furtherQuestions: any[]): string {
		// Update internal state
		this.messageAnnotations[3].content = furtherQuestions;

		// Return only the delta annotation
		const annotation = {
			type: 'FURTHER_QUESTIONS',
			data: furtherQuestions
				.map((q) => q.question || '')
				.filter((q) => q !== ''),
		};
		return `8:[${JSON.stringify(annotation)}]\n`;
	}

	/**
	 * Format a text chunk using the text stream part
	 */
	formatTextChunk(text: string): string {
		return `0:${JSON.stringify(text)}\n`;
	}

	/**
	 * Format an error using the error stream part
	 */
	formatError(errorMessage: string): string {
		return `3:${JSON.stringify(errorMessage)}\n`;
	}

	/**
	 * Format a completion message
	 */
	formatCompletion(
		promptTokens: number = 156,
		completionTokens: number = 204,
	): string {
		const totalTokens = promptTokens + completionTokens;
		const completionData = {
			finishReason: 'stop',
			usage: {
				promptTokens,
				completionTokens,
				totalTokens,
			},
		};
		return `d:${JSON.stringify(completionData)}\n`;
	}

	/**
	 * Reset the service state for a new stream
	 */
	reset(): void {
		this.terminalIdx = 1;
		this.messageAnnotations = [
			{ type: 'TERMINAL_INFO', content: [] },
			{ type: 'SOURCES', content: [] },
			{ type: 'ANSWER', content: [] },
			{ type: 'FURTHER_QUESTIONS', content: [] },
		];
	}
}
