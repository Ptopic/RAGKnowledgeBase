import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as crypto from 'node:crypto';
import { RedisPubSubService } from '../redis/redis.service';

// Event shape published to Redis "sse-broadcast" channel
// Matches hegnar-journalist-boost EventService.sendEvent() payload
interface SseBroadcastEvent {
	id: string;
	topic: string;
	// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
	data?: any;
	timestamp: number;
	targetConnectionId?: string;
	excludeConnectionId?: string;
	broadcastToAll?: boolean;
	broadcastToOtherUsers?: boolean;
}

// Matches hegnar-journalist-boost SSEEventResponse
export interface SSEEventResponse {
	success: boolean;
	eventId?: string;
	error?: string;
}

// Matches hegnar-journalist-boost SSEEventPayload
interface SSEEventPayload {
	topic: string;
	// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
	data?: any;
	targetConnectionId?: string;
	excludeConnectionId?: string;
	broadcastToAll?: boolean;
	broadcastToOtherUsers?: boolean;
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
	}

	removeConnection(connectionId: string): void {
		const client$ = this.connections.get(connectionId);
		if (client$) {
			client$.complete();
			this.connections.delete(connectionId);
		}
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

	// --- Core send method (matches hegnar EventService.sendEvent) ---

	async sendEvent(payload: SSEEventPayload): Promise<SSEEventResponse> {
		try {
			const event: SseBroadcastEvent = {
				id: crypto.randomUUID(),
				topic: payload.topic,
				data: payload.data || {},
				timestamp: Date.now(),
				targetConnectionId: payload.targetConnectionId,
				excludeConnectionId: payload.excludeConnectionId,
				broadcastToAll: payload.broadcastToAll,
				broadcastToOtherUsers: payload.broadcastToOtherUsers,
			};

			await this.redisPubSub.publish('sse-broadcast', JSON.stringify(event));

			return {
				success: true,
				eventId: event.id,
			};
		} catch (error) {
			this.logger.error('❌ [EventService] Failed to send event:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	// --- Public API (matches hegnar EventService methods 1:1) ---

	/** Send to a specific connection. Matches hegnar EventService.pushEventToTopic() */
	async pushEventToTopic(
		topic: string,
		connectionId: string,
		// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
		data?: any,
	): Promise<SSEEventResponse> {
		const payload = { topic, data, targetConnectionId: connectionId };
		return this.sendEvent(payload);
	}

	/** Broadcast to all connections on a topic. Matches hegnar EventService.broadcastToTopic() */
	async broadcastToTopic(
		topic: string,
		// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
		data?: any,
	): Promise<SSEEventResponse> {
		const payload = { topic, data, broadcastToAll: true };
		return this.sendEvent(payload);
	}

	/** Broadcast to all other users in a topic (excluding one). Matches hegnar EventService.broadcastToAllOtherUsersInTopic() */
	async broadcastToAllOtherUsersInTopic(
		topic: string,
		connectionId: string,
		// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
		data?: any,
	): Promise<SSEEventResponse> {
		const payload = {
			topic,
			data,
			excludeConnectionId: connectionId,
			broadcastToOtherUsers: true,
		};
		return this.sendEvent(payload);
	}

	/** Broadcast to all topics. Matches hegnar EventService.broadcastToAllTopics() */
	async broadcastToAllTopics(
		// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
		data?: any,
	): Promise<SSEEventResponse> {
		const payload = { topic: '*', data, broadcastToAll: true };
		return this.sendEvent(payload);
	}

	/** Broadcast to all other users in all topics. Matches hegnar EventService.broadcastToAllOtherUsersInAllTopics() */
	async broadcastToAllOtherUsersInAllTopics(
		connectionId: string,
		// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
		data?: any,
	): Promise<SSEEventResponse> {
		const payload = {
			topic: '*',
			data,
			excludeConnectionId: connectionId,
			broadcastToOtherUsers: true,
		};
		return this.sendEvent(payload);
	}

	// --- Convenience wrapper for existing callers (LogsService, TaskLoggingService) ---

	async broadcastEvent(event: { topic: string; data: any; searchSpaceId?: number }): Promise<SSEEventResponse> {
		return this.broadcastToTopic(event.topic, event.data);
	}

	broadcastToSearchSpace(searchSpaceId: number, event: { topic: string; data: any }): Promise<SSEEventResponse> {
		return this.broadcastToTopic(event.topic, event.data);
	}

	// --- Local connection routing (matches hegnar route.ts broadcastToLocalConnections) ---

	private broadcastToLocalConnections(event: SseBroadcastEvent): void {
		const {
			broadcastToAll,
			broadcastToOtherUsers,
			excludeConnectionId,
			targetConnectionId,
		} = event;

		const message = JSON.stringify(event);
		const toRemove: string[] = [];

		if (targetConnectionId) {
			// Send to specific client
			const client$ = this.connections.get(targetConnectionId);
			if (client$) {
				try {
					client$.next({ data: message });
				} catch {
					toRemove.push(targetConnectionId);
				}
			}
		} else if (broadcastToOtherUsers && excludeConnectionId) {
			// Send to all except one
			for (const [id, client$] of this.connections) {
				if (id !== excludeConnectionId) {
					try {
						client$.next({ data: message });
					} catch {
						toRemove.push(id);
					}
				}
			}
		} else if (broadcastToAll) {
			// Send to all
			for (const [id, client$] of this.connections) {
				try {
					client$.next({ data: message });
				} catch {
					toRemove.push(id);
				}
			}
		} else {
			// Default: send to all (client filters by topic)
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
