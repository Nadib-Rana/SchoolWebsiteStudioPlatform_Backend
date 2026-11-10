import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AddPhotoDto } from "./dto/gallery.dto";
import { extractStorageKey } from "./gallery.helper";

@Injectable()
export class AlbumPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async addPhoto(albumId: string, dto: AddPhotoDto) {
    const photo = await this.prisma.galleryPhoto.create({
      data: {
        albumId,
        caption: dto.caption || null,
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl || null,
        sizeBytes: dto.sizeBytes ? BigInt(dto.sizeBytes) : null,
        order: dto.order || 0,
      },
    });

    await this.prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { photosCount: { increment: 1 } },
    });

    return {
      ...photo,
      sizeBytes: photo.sizeBytes ? Number(photo.sizeBytes) : null,
    };
  }

  async deletePhoto(albumId: string, photoId: string) {
    const photo = await this.prisma.galleryPhoto.findFirst({
      where: { id: photoId, albumId },
    });

    if (!photo) {
      throw new NotFoundException("Photo not found");
    }

    const key = extractStorageKey(photo.url);
    if (key) {
      try {
        await this.storageService.deleteObject(key);
      } catch {}
    }

    await this.prisma.galleryPhoto.delete({ where: { id: photoId } });

    const album = await this.prisma.galleryAlbum.findUnique({
      where: { id: albumId },
    });
    const updateData: any = { photosCount: { decrement: 1 } };
    if (album?.coverUrl === photo.url) {
      const remainingPhoto = await this.prisma.galleryPhoto.findFirst({
        where: { albumId, id: { not: photoId } },
      });
      updateData.coverUrl = remainingPhoto ? remainingPhoto.url : null;
    }

    await this.prisma.galleryAlbum.update({
      where: { id: albumId },
      data: updateData,
    });

    return { message: "Photo deleted successfully" };
  }
}
