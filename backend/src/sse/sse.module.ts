import { Global, Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { SseController } from "./sse.controller";
import { SseService } from "./sse.service";

@Global()
@Module({
	imports: [RedisModule],
	controllers: [SseController],
	providers: [SseService],
	exports: [SseService],
})
export class SseModule {}
