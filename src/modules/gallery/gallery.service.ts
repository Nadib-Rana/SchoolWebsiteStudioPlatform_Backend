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

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private extractStorageKey(urlOrKey: string): string | null {
    if (!urlOrKey) return null;
    if (urlOrKey.startsWith("tenants/")) return urlOrKey;
    const match = urlOrKey.match(/tenants\/[^?#]+/);
    if (match) return match[0];
    if (urlOrKey.startsWith("uploads/")) return urlOrKey;
    return null;
  }

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

    // Sum storage used
    const totalBytesUsed = mediaAssets.reduce(
      (acc, item) => acc + Number(item.sizeBytes || 0),
      0,
    );
    const totalLimitBytes = Number(school?.planStorageLimit || 10737418240); // 10 GB

    const usedMb = (totalBytesUsed / (1024 * 1024)).toFixed(1);
    const limitGb = (totalLimitBytes / (1024 * 1024 * 1024)).toFixed(0);
    const usagePercent = Math.min(
      100,
      Math.round((totalBytesUsed / totalLimitBytes) * 100),
    );

    return {
      storage: {
        usedBytes: totalBytesUsed,
        limitBytes: totalLimitBytes,
        usedFormatted: `${usedMb} MB`,
        limitFormatted: `${limitGb} GB`,
        percentage: `${usagePercent}%`,
      },
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
      const key = this.extractStorageKey(p.url);
      if (key) {
        try {
          await this.storageService.deleteObject(key);
        } catch {
          // Best-effort cleanup
        }
      }
    }
    if (album.coverUrl) {
      const coverKey = this.extractStorageKey(album.coverUrl);
      if (coverKey) {
        try {
          await this.storageService.deleteObject(coverKey);
        } catch {
          // Best-effort cleanup
        }
      }
    }

    await this.prisma.galleryAlbum.delete({
      where: { id: albumId },
    });

    return { message: "Album deleted successfully" };
  }

  async addPhoto(schoolId: string, albumId: string, dto: AddPhotoDto) {
    await this.getAlbumById(schoolId, albumId);

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

    // Update album photo count
    await this.prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { photosCount: { increment: 1 } },
    });

    return {
      ...photo,
      sizeBytes: photo.sizeBytes ? Number(photo.sizeBytes) : null,
    };
  }

  async deletePhoto(schoolId: string, albumId: string, photoId: string) {
    await this.getAlbumById(schoolId, albumId);

    const photo = await this.prisma.galleryPhoto.findFirst({
      where: { id: photoId, albumId },
    });

    if (!photo) {
      throw new NotFoundException("Photo not found");
    }

    const key = this.extractStorageKey(photo.url);
    if (key) {
      try {
        await this.storageService.deleteObject(key);
      } catch {
        // Best-effort cleanup
      }
    }

    await this.prisma.galleryPhoto.delete({
      where: { id: photoId },
    });

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

  async getMediaAssets(schoolId: string, category?: string) {
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        schoolId,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return assets.map((a) => ({
      ...a,
      sizeBytes: Number(a.sizeBytes),
      sizeFormatted: `${(Number(a.sizeBytes) / (1024 * 1024)).toFixed(1)} MB`,
    }));
  }

  async createMediaAsset(schoolId: string, dto: CreateMediaAssetDto) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        schoolId,
        filename: dto.filename,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl || null,
        category: dto.category || "IMAGE",
        tags: dto.tags || [],
      },
    });

    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
    };
  }

  async deleteMediaAsset(schoolId: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: assetId, schoolId },
    });

    if (!asset) {
      throw new NotFoundException("Media asset not found");
    }

    const key = this.extractStorageKey(asset.filename) || this.extractStorageKey(asset.url);
    if (key) {
      try {
        await this.storageService.deleteObject(key);
      } catch {
        // Best-effort cleanup
      }
    }

    await this.prisma.mediaAsset.delete({
      where: { id: assetId },
    });

    return { message: "Media asset deleted successfully" };
  }
}
