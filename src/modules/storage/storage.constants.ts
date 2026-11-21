export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "application/pdf",
] as const;

export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".ico",
  ".pdf",
] as const;

export const MAX_UPLOAD_FILE_SIZE = 25 * 1024 * 1024; // 25 MB max
