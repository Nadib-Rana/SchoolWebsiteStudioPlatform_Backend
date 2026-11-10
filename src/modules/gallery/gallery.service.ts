import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  AddPhotoDto,
  CreateMediaAssetDto,
} from "./dto/gallery.dto";
import { extractStorageKey, calculateStorageStats } from "./gallery.helper";
import { MediaAssetsService } from "./media-assets.service";
import { AlbumPhotosService } from "./album-photos.service";

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly albumPhotosService: AlbumPhotosService,
  ) {}

  async getGalleryOverview(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { planStorageLimit: true },
    });

    const [albums, mediaAssets] = await Promise.all([
      this.prisma.galleryAlbum.findMany({
        where: { schoolId },
        include: {
          _count: { select: { photos: true } },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.mediaAsset.findMany({
        where: { schoolId },
      }),
    ]);

    const storage = calculateStorageStats(
      mediaAssets,
      school?.planStorageLimit,
    );

    return {
      storage,
      albumsCount: albums.length,
      mediaCount: mediaAssets.length,
      albums,
    };
  }

  async getAlbums(schoolId: string) {
    return this.prisma.galleryAlbum.findMany({
      where: { schoolId },
      include: {
        _count: { select: { photos: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async getAlbumById(schoolId: string, albumId: string) {
    const album = await this.prisma.galleryAlbum.findFirst({
      where: { id: albumId, schoolId },
      include: {
        photos: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!album) {
      throw new NotFoundException("Gallery album not found");
    }

    return {
      ...album,
      photos: album.photos.map((p) => ({
        ...p,
        sizeBytes: p.sizeBytes ? Number(p.sizeBytes) : null,
      })),
    };
  }

  async createAlbum(schoolId: string, dto: CreateAlbumDto) {
    const existing = await this.prisma.galleryAlbum.findUnique({
      where: {
        schoolId_slug: {
          schoolId,
          slug: dto.slug.toLowerCase().trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException("Album with this slug already exists");
    }

    return this.prisma.galleryAlbum.create({
      data: {
        schoolId,
        title: dto.title,
        slug: dto.slug.toLowerCase().trim(),
        description: dto.description || null,
        coverUrl: dto.coverUrl || null,
        category: dto.category || "General",
      },
    });
  }

  async updateAlbum(schoolId: string, albumId: string, dto: UpdateAlbumDto) {
    await this.getAlbumById(schoolId, albumId);

    return this.prisma.galleryAlbum.update({
      where: { id: albumId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined
          ? { slug: dto.slug.toLowerCase().trim() }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  async deleteAlbum(schoolId: string, albumId: string) {
    const album = await this.getAlbumById(schoolId, albumId);

    const photos = await this.prisma.galleryPhoto.findMany({
      where: { albumId },
      select: { url: true },
    });
    for (const p of photos) {
      const key = extractStorageKey(p.url);
      if (key) {
        try {
          await this.storageService.deleteObject(key);
        } catch {}
      }
    }
    if (album.coverUrl) {
      const coverKey = extractStorageKey(album.coverUrl);
      if (coverKey) {
        try {
          await this.storageService.deleteObject(coverKey);
        } catch {}
      }
    }

    await this.prisma.galleryAlbum.delete({ where: { id: albumId } });
    return { message: "Album deleted successfully" };
  }

  async addPhoto(schoolId: string, albumId: string, dto: AddPhotoDto) {
    await this.getAlbumById(schoolId, albumId);
    return this.albumPhotosService.addPhoto(albumId, dto);
  }

  async deletePhoto(schoolId: string, albumId: string, photoId: string) {
    await this.getAlbumById(schoolId, albumId);
    return this.albumPhotosService.deletePhoto(albumId, photoId);
  }

  async getMediaAssets(schoolId: string, category?: string) {
    return this.mediaAssetsService.getMediaAssets(schoolId, category);
  }

  async createMediaAsset(schoolId: string, dto: CreateMediaAssetDto) {
    return this.mediaAssetsService.createMediaAsset(schoolId, dto);
  }

  async deleteMediaAsset(schoolId: string, assetId: string) {
    return this.mediaAssetsService.deleteMediaAsset(schoolId, assetId);
  }
}
