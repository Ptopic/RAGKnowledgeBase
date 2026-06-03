import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

@Module({
	imports: [PrismaModule, ConfigModule, forwardRef(() => QueueModule)],
	controllers: [SubscriptionController],
	providers: [SubscriptionService],
	exports: [SubscriptionService],
})
export class SubscriptionModule {}
