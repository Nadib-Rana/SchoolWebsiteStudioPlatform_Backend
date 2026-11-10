import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { StorageService } from "../storage/storage.service";
import { CreateMediaAssetDto } from "./dto/gallery.dto";
import { extractStorageKey } from "./gallery.helper";

@Injectable()
export class MediaAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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

    const key =
      extractStorageKey(asset.filename) || extractStorageKey(asset.url);
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
