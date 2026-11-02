import { Module } from "@nestjs/common";
import { GalleryService } from "./gallery.service";
import { GalleryController } from "./gallery.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [GalleryController],
  providers: [GalleryService, PrismaService],
  exports: [GalleryService],
})
export class GalleryModule {}
