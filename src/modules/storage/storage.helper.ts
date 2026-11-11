import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Role } from "@prisma/client";
import * as path from "path";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from "./storage.constants";

export async function resolveUserSchoolId(
  prisma: PrismaService,
  userId?: string,
): Promise<string | undefined> {
  if (!userId) return undefined;
  const defaultMember = await prisma.schoolMember.findFirst({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return defaultMember?.schoolId;
}

export function validateFileExtAndMime(filename: string, mimeType?: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext as any)) {
    throw new BadRequestException(
      `Unsupported file extension '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }

  if (
    mimeType &&
    !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase() as any)
  ) {
    throw new BadRequestException(
      `Unsupported MIME type '${mimeType}'. Allowed MIME types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }
}

export async function checkSchoolStorageQuota(
  prisma: PrismaService,
  schoolId: string,
) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planStorageLimit: true },
  });
  if (school?.planStorageLimit) {
    const usage = await prisma.mediaAsset.aggregate({
      where: { schoolId },
      _sum: { sizeBytes: true },
    });
    const totalUsed = usage._sum.sizeBytes || 0n;
    if (BigInt(totalUsed) >= BigInt(school.planStorageLimit)) {
      throw new BadRequestException(
        "Storage limit reached for this school subscription plan. Please upgrade plan.",
      );
    }
  }
}

export async function validateTenantDeletePermission(
  prisma: PrismaService,
  key: string,
  user: { id: string; role: Role },
) {
  if (user.role === Role.SUPER_ADMIN) return;

  if (!key.startsWith("tenants/")) {
    throw new ForbiddenException(
      "Cannot delete storage objects outside your tenant namespace",
    );
  }

  const parts = key.split("/");
  const targetSchoolId = parts[1];

  const membership = await prisma.schoolMember.findUnique({
    where: {
      schoolId_userId: {
        schoolId: targetSchoolId,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenException(
      "You are not authorized to delete storage objects belonging to another school tenant",
    );
  }
}

export interface NormalizedStorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
}

export function normalizeStorageEndpoint(
  rawEndpoint?: string,
  rawPort?: number,
  rawUseSSL?: boolean,
): NormalizedStorageConfig | null {
  if (!rawEndpoint) return null;
  let endpoint = rawEndpoint.trim();
  if (!endpoint) return null;

  let useSSL = Boolean(rawUseSSL);
  if (/^https:\/\//i.test(endpoint)) {
    useSSL = true;
  }

  endpoint = endpoint.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

  let port = rawPort;
  if (endpoint.includes(":")) {
    const parts = endpoint.split(":");
    endpoint = parts[0];
    port = parseInt(parts[1], 10);
  }

  if (useSSL) {
    if (!port || port === 9000) {
      port = 443;
    }
  } else {
    if (!port) {
      port = 9000;
    }
  }

  return { endPoint: endpoint, port, useSSL };
}

export function getPublicBucketPolicy(bucketName: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
}
