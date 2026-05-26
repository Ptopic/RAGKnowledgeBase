import { Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
	imports: [RedisModule],
	controllers: [SseController],
	providers: [SseService],
	exports: [SseService],
})
export class SseModule {}
