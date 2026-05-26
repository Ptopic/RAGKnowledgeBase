import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as crypto from 'node:crypto';

@Injectable()
export class SseService {
	private readonly logger = new Logger(SseService.name);
	private connections: Map<string, Subject<{ data: string }>> = new Map();

	addConnection(connectionId: string, client$: Subject<{ data: string }>): void {
		this.connections.set(connectionId, client$);
		this.logger.log(`SSE client connected: ${connectionId} (total: ${this.connections.size})`);
	}

	removeConnection(connectionId: string): void {
		const client$ = this.connections.get(connectionId);
		if (client$) {
			client$.complete();
			this.connections.delete(connectionId);
		}
		this.logger.log(`SSE client disconnected: ${connectionId} (total: ${this.connections.size})`);
	}

	closeExistingConnection(connectionId: string): void {
		const existing = this.connections.get(connectionId);
		if (existing) {
			try {
				existing.complete();
			} catch {
				// Already closed
			}
			this.connections.delete(connectionId);
		}
	}

	broadcastEvent(event: { topic: string; data: any; searchSpaceId?: number }): void {
		const enrichedEvent = {
			id: crypto.randomUUID(),
			topic: event.topic,
			data: event.data || {},
			timestamp: Date.now(),
		};
		const message = JSON.stringify(enrichedEvent);
		let sent = 0;
		const toRemove: string[] = [];

		for (const [connectionId, client$] of this.connections) {
			try {
				client$.next({ data: message });
				sent++;
			} catch {
				toRemove.push(connectionId);
			}
		}

		for (const id of toRemove) {
			this.removeConnection(id);
		}

		this.logger.debug(`Broadcast event [${event.topic}]: sent to ${sent} connections`);
	}

	broadcastToSearchSpace(searchSpaceId: number, event: { topic: string; data: any }): void {
		this.broadcastEvent({ ...event, searchSpaceId });
	}
}
