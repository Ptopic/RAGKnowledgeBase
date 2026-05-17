import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";

@Module({
	controllers: [NotebooksController],
	providers: [NotebooksService, PrismaService],
	exports: [NotebooksService],
})
export class NotebooksModule {}
