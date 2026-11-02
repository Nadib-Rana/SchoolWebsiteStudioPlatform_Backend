import { Module } from "@nestjs/common";
import { PublishingService } from "./publishing.service";
import { PublishingController } from "./publishing.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [PublishingController],
  providers: [PublishingService, PrismaService],
  exports: [PublishingService],
})
export class PublishingModule {}
