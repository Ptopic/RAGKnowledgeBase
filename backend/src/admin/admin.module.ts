import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionModule } from "../subscription/subscription.module";

@Module({
	imports: [SubscriptionModule],
	controllers: [AdminController],
	providers: [AdminService, PrismaService],
	exports: [AdminService],
})
export class AdminModule {}
