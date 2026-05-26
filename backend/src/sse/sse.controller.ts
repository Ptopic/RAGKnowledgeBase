import { Body, Controller, Post, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import * as crypto from 'node:crypto';
import { SseService, SSEEventResponse } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

interface SSEMessageEvent {
	data: string;
	id?: string;
	type?: string;
}

interface PublishEventBody {
	topic: string;
	// biome-ignore lint/suspicious/noExplicitAny: SSE data can contain anything
	data?: any;
	targetConnectionId?: string;
	excludeConnectionId?: string;
	broadcastToAll?: boolean;
	broadcastToOtherUsers?: boolean;
}

@Controller('sse')
@UseGuards(JwtAuthGuard)
export class SseController {
	constructor(private readonly sseService: SseService) {}

	@Sse('events')
	sse(@Req() req: any): Observable<SSEMessageEvent> {
		const userId = req.user.id;
		const stop$ = new Subject<void>();

		// Close existing connection for this user (graceful reconnect)
		this.sseService.closeExistingConnection(userId);

		const client$ = new Subject<SSEMessageEvent>();
		this.sseService.addConnection(userId, client$);

		const handshake = {
			id: crypto.randomUUID(),
			topic: 'connection',
			data: {
				message: 'Connected to SSE',
				connectionId: userId,
			},
			timestamp: Date.now(),
		};
		client$.next({
			data: JSON.stringify(handshake),
		});

		// Heartbeat every 30 seconds to keep connection alive
		const heartbeat$ = interval(30000).pipe(
			takeUntil(stop$),
			map(() => ({
				data: JSON.stringify({
					id: crypto.randomUUID(),
					topic: 'heartbeat',
					data: { timestamp: Date.now() },
					timestamp: Date.now(),
				}),
			})),
		);

		const merged$ = new Observable<SSEMessageEvent>((subscriber) => {
			client$.subscribe(subscriber);
			heartbeat$.subscribe(subscriber);

			req.on('close', () => {
				this.sseService.removeConnection(userId);
				stop$.next();
				stop$.complete();
				client$.complete();
				subscriber.complete();
			});
		});

		return merged$;
	}

	@Post('events')
	async publishEvent(@Body() body: PublishEventBody): Promise<SSEEventResponse> {
		const {
			topic,
			data,
			targetConnectionId,
			excludeConnectionId,
			broadcastToAll,
			broadcastToOtherUsers,
		} = body;

		if (!topic) {
			return { success: false, error: 'topic is required' };
		}

		return this.sseService.sendEvent({
			topic,
			data,
			targetConnectionId,
			excludeConnectionId,
			broadcastToAll,
			broadcastToOtherUsers,
		});
	}
}
