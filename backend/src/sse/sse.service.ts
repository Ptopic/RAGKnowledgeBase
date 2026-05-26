import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as crypto from 'node:crypto';
import { RedisPubSubService } from '../redis/redis.service';

interface SseBroadcastEvent {
	id: string;
	topic: string;
	data: Record<string, unknown>;
	timestamp: number;
	broadcastToAll?: boolean;
	broadcastToOtherUsers?: boolean;
	excludeConnectionId?: string;
	targetConnectionId?: string;
}

@Injectable()
export class SseService implements OnModuleInit {
	private readonly logger = new Logger(SseService.name);
	private connections: Map<string, Subject<{ data: string }>> = new Map();

	constructor(private readonly redisPubSub: RedisPubSubService) {}

	async onModuleInit() {
		await this.redisPubSub.subscribe('sse-broadcast', (channel, message) => {
			if (channel === 'sse-broadcast') {
				try {
					const event: SseBroadcastEvent = JSON.parse(message);
					this.broadcastToLocalConnections(event);
				} catch (error) {
					this.logger.error('Error processing Redis message:', error);
				}
			}
		});
		this.logger.log('SSE subscribed to Redis channel: sse-broadcast');
	}

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

	broadcastEvent(event: { topic: string; data: Record<string, unknown>; searchSpaceId?: number }): void {
		const enrichedEvent: SseBroadcastEvent = {
			id: crypto.randomUUID(),
			topic: event.topic,
			data: event.data || {},
			timestamp: Date.now(),
			broadcastToAll: true,
		};
		this.redisPubSub.publish('sse-broadcast', JSON.stringify(enrichedEvent));
	}

	broadcastToSearchSpace(searchSpaceId: number, event: { topic: string; data: Record<string, unknown> }): void {
		this.broadcastEvent({ ...event, searchSpaceId });
	}

	async pushEventToConnection(topic: string, connectionId: string, data?: Record<string, unknown>): Promise<void> {
		const enrichedEvent: SseBroadcastEvent = {
			id: crypto.randomUUID(),
			topic,
			data: data || {},
			timestamp: Date.now(),
			targetConnectionId: connectionId,
		};
		await this.redisPubSub.publish('sse-broadcast', JSON.stringify(enrichedEvent));
	}

	async broadcastToOtherUsers(topic: string, excludeConnectionId: string, data?: Record<string, unknown>): Promise<void> {
		const enrichedEvent: SseBroadcastEvent = {
			id: crypto.randomUUID(),
			topic,
			data: data || {},
			timestamp: Date.now(),
			broadcastToOtherUsers: true,
			excludeConnectionId,
		};
		await this.redisPubSub.publish('sse-broadcast', JSON.stringify(enrichedEvent));
	}

	private broadcastToLocalConnections(event: SseBroadcastEvent): void {
		const { broadcastToOtherUsers, excludeConnectionId, targetConnectionId } = event;
		const message = JSON.stringify(event);
		const toRemove: string[] = [];

		if (targetConnectionId) {
			const client$ = this.connections.get(targetConnectionId);
			if (client$) {
				try {
					client$.next({ data: message });
				} catch {
					toRemove.push(targetConnectionId);
				}
			}
		} else if (broadcastToOtherUsers && excludeConnectionId) {
			for (const [id, client$] of this.connections) {
				if (id !== excludeConnectionId) {
					try {
						client$.next({ data: message });
					} catch {
						toRemove.push(id);
					}
				}
			}
		} else {
			for (const [id, client$] of this.connections) {
				try {
					client$.next({ data: message });
				} catch {
					toRemove.push(id);
				}
			}
		}

		for (const id of toRemove) {
			this.removeConnection(id);
		}
	}
}
