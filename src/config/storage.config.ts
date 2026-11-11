import { registerAs } from "@nestjs/config";

export default registerAs("storage", () => ({
  driver: process.env.STORAGE_DRIVER || "minio",
  endpoint:
    process.env.STORAGE_ENDPOINT ||
    process.env.STORAGE_HOST ||
    process.env.MINIO_ENDPOINT ||
    process.env.MINIO_HOST ||
    "localhost",
  port: parseInt(
    process.env.STORAGE_PORT || process.env.MINIO_PORT || "9000",
    10,
  ),
  useSSL:
    (process.env.STORAGE_USE_SSL ||
      process.env.STORAGE_SSL ||
      process.env.MINIO_USE_SSL ||
      process.env.MINIO_SSL) === "true",
  accessKey:
    process.env.STORAGE_ACCESS_KEY ||
    process.env.MINIO_ACCESS_KEY ||
    process.env.MINIO_ROOT_USER ||
    "minioadmin",
  secretKey:
    process.env.STORAGE_SECRET_KEY ||
    process.env.MINIO_SECRET_KEY ||
    process.env.MINIO_ROOT_PASSWORD ||
    "minioadmin",
  bucket:
    process.env.STORAGE_BUCKET ||
    process.env.MINIO_BUCKET ||
    "nest-starter-uploads",
  region: process.env.STORAGE_REGION || process.env.MINIO_REGION || "us-east-1",
  publicUrl:
    process.env.STORAGE_PUBLIC_URL ||
    "http://localhost:9000/nest-starter-uploads",
}));
