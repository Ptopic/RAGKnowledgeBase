import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import {
	CREDITS_GUARD_SERVICE,
	CreditsRequiredGuard,
} from "./guards/credits-required.guard";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

@Module({
	imports: [PrismaModule, ConfigModule, forwardRef(() => QueueModule)],
	controllers: [SubscriptionController],
	providers: [
		SubscriptionService,
		CreditsRequiredGuard,
		{
			// Bind the structural `CreditsGuardSubscriptionService` token
			// to the real `SubscriptionService` instance. The guard is
			// type-checked against the structural interface, but at
			// runtime NestJS needs a class/token to resolve — this is
			// that binding.
			provide: CREDITS_GUARD_SERVICE,
			useExisting: SubscriptionService,
		},
	],
	exports: [SubscriptionService, CreditsRequiredGuard, CREDITS_GUARD_SERVICE],
})
export class SubscriptionModule {}
