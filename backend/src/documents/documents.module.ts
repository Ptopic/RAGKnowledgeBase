import { Module } from "@nestjs/common";
import { PermissionsModule } from "../permissions/permissions.module";
import { PrismaService } from "../prisma/prisma.service";
import { QueueModule } from "../queue/queue.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
	imports: [QueueModule, PermissionsModule],
	controllers: [DocumentsController],
	providers: [DocumentsService, PrismaService],
	exports: [DocumentsService],
})
export class DocumentsModule {}
