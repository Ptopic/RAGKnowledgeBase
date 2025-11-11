import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueModule } from "../queue/queue.module";
import { SearchSourceConnectorsController } from "./search-source-connectors.controller";
import { SearchSourceConnectorsService } from "./search-source-connectors.service";

@Module({
	imports: [QueueModule],
	controllers: [SearchSourceConnectorsController],
	providers: [SearchSourceConnectorsService, PrismaService],
	exports: [SearchSourceConnectorsService],
})
export class SearchSourceConnectorsModule {}
