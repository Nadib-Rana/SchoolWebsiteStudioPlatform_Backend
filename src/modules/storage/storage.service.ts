import { Injectable, Logger, OnModuleInit, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client as MinioClient } from "minio";
import * as path from "path";
import * as crypto from "crypto";
import { normalizeStorageEndpoint, getPublicBucketPolicy } from "./storage.helper";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: MinioClient | null = null;
  private readonly defaultBucket: string;
  private readonly defaultExpirySeconds = 900;

  constructor(private readonly configService: ConfigService) {
    this.defaultBucket = this.configService.get<string>("storage.bucket", "nest-starter-uploads");
  }

  async onModuleInit() {
    const rawEndPoint = this.configService.get<string>("storage.endpoint");
    const rawPort = this.configService.get<number>("storage.port", 9000);
    const rawUseSSL = this.configService.get<boolean>("storage.useSSL", false);
    const accessKey = this.configService.get<string>("storage.accessKey");
    const secretKey = this.configService.get<string>("storage.secretKey");

    const normalized = normalizeStorageEndpoint(rawEndPoint, rawPort, rawUseSSL);
    if (!normalized || !accessKey || !secretKey) return;

    try {
      const client = new MinioClient({
        endPoint: normalized.endPoint,
        port: normalized.port,
        useSSL: normalized.useSSL,
        accessKey,
        secretKey,
      });

      const exists = await client.bucketExists(this.defaultBucket);
      if (!exists) {
        const region = this.configService.get<string>("storage.region", "us-east-1");
        await client.makeBucket(this.defaultBucket, region);
        this.logger.log(`Created default storage bucket: ${this.defaultBucket}`);
      }

      try {
        await client.setBucketPolicy(this.defaultBucket, getPublicBucketPolicy(this.defaultBucket));
      } catch {
        // Ignore if provider restricts policy modification
      }

      this.minioClient = client;
      this.logger.log(`✅ Storage connected: ${normalized.endPoint}:${normalized.port} (SSL: ${normalized.useSSL})`);
    } catch (err: any) {
      this.minioClient = null;
      this.logger.warn(`⚠️ Storage connection skipped (${err?.message || err}). Fallback active.`);
    }
  }

  isConfigured(): boolean {
    return this.minioClient !== null;
  }

  generateKey(folder = "uploads", originalName = "file", schoolId?: string): string {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(8).toString("hex");
    const prefix = schoolId ? `tenants/${schoolId}/${folder}` : folder;
    return `${prefix}/${Date.now()}-${hash}${ext}`;
  }

  getObjectUrl(key: string, bucket?: string): string {
    if (!key || key.startsWith("http://") || key.startsWith("https://") || key.startsWith("data:")) {
      return key || "";
    }
    const publicUrl = this.configService.get<string>("storage.publicUrl", "");
    const b = bucket || this.defaultBucket;
    if (publicUrl) {
      const cleanUrl = publicUrl.replace(/\/$/, "");
      return cleanUrl.endsWith(`/${b}`) ? `${cleanUrl}/${key.replace(/^\//, "")}` : `${cleanUrl}/${b}/${key.replace(/^\//, "")}`;
    }
    return key;
  }

  async getPresignedUploadUrl(
    key: string,
    bucket?: string,
    expirySeconds?: number,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const b = bucket || this.defaultBucket;
    const expiry = expirySeconds || this.defaultExpirySeconds;
    if (!this.minioClient) {
      const fallbackUrl = this.getObjectUrl(key, b);
      return { uploadUrl: fallbackUrl, key, publicUrl: fallbackUrl };
    }
    try {
      const uploadUrl = await this.minioClient.presignedPutObject(b, key, expiry);
      return { uploadUrl, key, publicUrl: this.getObjectUrl(key, b) };
    } catch {
      const fallbackUrl = this.getObjectUrl(key, b);
      return { uploadUrl: fallbackUrl, key, publicUrl: fallbackUrl };
    }
  }

  async getPresignedObjectUrl(key: string, bucket?: string, expirySeconds?: number): Promise<string> {
    if (!this.minioClient) return this.getObjectUrl(key, bucket);
    try {
      return await this.minioClient.presignedGetObject(bucket || this.defaultBucket, key, expirySeconds || this.defaultExpirySeconds);
    } catch {
      return this.getObjectUrl(key, bucket);
    }
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    mimeType?: string,
    bucket?: string,
  ): Promise<{ key: string; publicUrl: string }> {
    const b = bucket || this.defaultBucket;
    if (!this.minioClient) {
      this.logger.warn(`MinIO not connected; returning fallback URL for ${key}`);
      return { key, publicUrl: this.getObjectUrl(key, b) };
    }
    try {
      await this.minioClient.putObject(b, key, buffer, buffer.length, {
        "Content-Type": mimeType || "application/octet-stream",
      });
      return { key, publicUrl: this.getObjectUrl(key, b) };
    } catch (err: any) {
      this.logger.error(`Failed to upload ${key} to bucket ${b}: ${err?.message || err}`);
      throw new BadRequestException(`File upload to storage failed: ${err?.message || "Storage error"}`);
    }
  }

  async deleteObject(key: string, bucket?: string): Promise<boolean> {
    if (!this.minioClient) return true;
    try {
      await this.minioClient.removeObject(bucket || this.defaultBucket, key);
      return true;
    } catch (err) {
      this.logger.error(`Failed to delete object: ${key}`, err);
      return false;
    }
  }
}
