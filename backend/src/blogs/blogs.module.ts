import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BlogsController } from "./blogs.controller";
import { BlogsService } from "./blogs.service";

@Module({
	controllers: [BlogsController],
	providers: [BlogsService, PrismaService],
	exports: [BlogsService],
})
export class BlogsModule {}
