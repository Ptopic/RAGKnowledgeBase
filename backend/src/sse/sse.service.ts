import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SseService {
	private readonly logger = new Logger(SseService.name);
	private connections: Map<string, ReadableStreamDefaultController> = new Map();

	addConnection(connectionId: string, controller: ReadableStreamDefaultController): void {
		this.connections.set(connectionId, controller);
		this.logger.log(`SSE client connected: ${connectionId} (total: ${this.connections.size})`);
	}

	removeConnection(connectionId: string): void {
		this.connections.delete(connectionId);
		this.logger.log(`SSE client disconnected: ${connectionId} (total: ${this.connections.size})`);
	}

	broadcastToSearchSpace(searchSpaceId: number, event: { topic: string; data: any }): void {
		const message = `data: ${JSON.stringify(event)}\n\n`;
		let sent = 0;
		for (const [connectionId, controller] of this.connections) {
			try {
				controller.enqueue(new TextEncoder().encode(message));
				sent++;
			} catch {
				this.logger.warn(`Failed to send to connection ${connectionId}, removing`);
				this.removeConnection(connectionId);
			}
		}
		this.logger.debug(`Broadcast to search space ${searchSpaceId}: sent to ${sent} connections`);
	}

	broadcastEvent(event: { topic: string; data: any; searchSpaceId?: number }): void {
		const message = `data: ${JSON.stringify(event)}\n\n`;
		let sent = 0;
		for (const [connectionId, controller] of this.connections) {
			try {
				controller.enqueue(new TextEncoder().encode(message));
				sent++;
			} catch {
				this.logger.warn(`Failed to send to connection ${connectionId}, removing`);
				this.removeConnection(connectionId);
			}
		}
		this.logger.debug(`Broadcast event [${event.topic}]: sent to ${sent} connections`);
	}
}
