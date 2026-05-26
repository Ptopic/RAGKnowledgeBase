import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisPubSubService.name);
	private publisher: Redis;
	private subscriber: Redis;

	constructor(private readonly configService: ConfigService) {}

	onModuleInit() {
		const host = this.configService.get<string>('queue.redis.host', 'localhost');
		const port = this.configService.get<number>('queue.redis.port', 6379);
		const password = this.configService.get<string>('queue.redis.password');
		const db = this.configService.get<number>('queue.redis.db', 0);

		const connectionOptions: Redis.RedisOptions = {
			host,
			port,
			password: password || undefined,
			db,
			maxRetriesPerRequest: null,
			enableReadyCheck: true,
			connectTimeout: 5000,
		};

		this.publisher = new Redis(connectionOptions);
		this.subscriber = new Redis(connectionOptions);

		const attachEventHandlers = (client: Redis, label: string) => {
			client.on('connect', () => this.logger.log(`${label} connecting...`));
			client.on('ready', () => this.logger.log(`${label} ready`));
			client.on('error', (err) => this.logger.error(`${label} error:`, err));
			client.on('close', () => this.logger.warn(`${label} connection closed`));
			client.on('reconnecting', () => this.logger.log(`${label} reconnecting...`));
		};

		attachEventHandlers(this.publisher, 'RedisPubSub Publisher');
		attachEventHandlers(this.subscriber, 'RedisPubSub Subscriber');

		this.logger.log('Redis PubSub client connected');
	}

	async publish(channel: string, message: string): Promise<void> {
		await this.publisher.publish(channel, message);
	}

	async subscribe(channel: string, callback: (channel: string, message: string) => void): Promise<void> {
		this.subscriber.on('message', callback);
		await this.subscriber.subscribe(channel);
	}

	async onModuleDestroy() {
		await this.publisher.quit();
		await this.subscriber.quit();
		this.logger.log('Redis PubSub connections closed');
	}
}
