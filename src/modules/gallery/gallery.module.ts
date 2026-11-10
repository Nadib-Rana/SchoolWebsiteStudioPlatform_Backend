import { Module } from "@nestjs/common";
import { GalleryService } from "./gallery.service";
import { MediaAssetsService } from "./media-assets.service";
import { AlbumPhotosService } from "./album-photos.service";
import { GalleryController } from "./gallery.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [GalleryController],
  providers: [
    GalleryService,
    MediaAssetsService,
    AlbumPhotosService,
    PrismaService,
  ],
  exports: [GalleryService, MediaAssetsService, AlbumPhotosService],
})
export class GalleryModule {}
