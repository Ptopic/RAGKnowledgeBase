import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueModule } from "../queue/queue.module";
import { SearchSourceConnectorsController } from "./search-source-connectors.controller";
import { SearchSourceConnectorsService } from "./search-source-connectors.service";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
	imports: [QueueModule, PermissionsModule],
	controllers: [SearchSourceConnectorsController],
	providers: [SearchSourceConnectorsService, PrismaService],
	exports: [SearchSourceConnectorsService],
})
export class SearchSourceConnectorsModule {}
