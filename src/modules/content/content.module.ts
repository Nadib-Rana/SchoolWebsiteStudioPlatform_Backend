import { Module } from "@nestjs/common";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [ContentController],
  providers: [ContentService, PrismaService],
  exports: [ContentService],
})
export class ContentModule {}
