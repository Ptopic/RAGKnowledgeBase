import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import * as crypto from 'node:crypto';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

interface SSEMessageEvent {
	data: string;
	id?: string;
	type?: string;
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
}
