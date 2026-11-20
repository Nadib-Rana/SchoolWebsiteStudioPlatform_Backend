import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ERP_CREDENTIAL_SECRET ||
    process.env.JWT_SECRET ||
    "school-website-studio-erp-credential-key";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(cipherText: string): string {
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // Fallback if stored unencrypted in legacy/dev environments
    return cipherText;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  const trimmed = apiKey.trim();
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 3)}••••`;
  }
  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

export function normalizeErpBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
}

export function verifyHmacSha256Signature(
  rawBody: string | Buffer,
  secret: string,
  signatureHeader?: string,
): boolean {
  if (!secret || !signatureHeader) return false;
  const provided = signatureHeader.trim().replace(/^sha256=/i, "");
  if (!provided) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function buildIdempotencyKey(parts: string[]): string {
  return crypto
    .createHash("sha256")
    .update(parts.map((p) => (p || "").trim().toLowerCase()).join("|"))
    .digest("hex")
    .slice(0, 32);
}

