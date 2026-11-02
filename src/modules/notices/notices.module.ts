import { Module } from "@nestjs/common";
import { NoticesService } from "./notices.service";
import { NoticesController } from "./notices.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [NoticesController],
  providers: [NoticesService, PrismaService],
  exports: [NoticesService],
})
export class NoticesModule {}
