import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AdmissionStatus, PublishStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  ConfigureIntegrationDto,
  TestErpConnectionDto,
} from "./dto/integrations.dto";
import {
  encryptSecret,
  decryptSecret,
  maskApiKey,
  normalizeErpBaseUrl,
  verifyHmacSha256Signature,
  buildIdempotencyKey,
} from "./erp-crypto.util";
import { ErpClientService } from "./erp-client.service";

const VALID_ADMISSION_STATUSES = new Set<string>(
  Object.values(AdmissionStatus),
);

export interface ActiveErpConfig {
  baseUrl: string;
  apiKey: string;
  tenantId?: string;
  schoolName?: string;
  subdomain?: string;
  enabled: boolean;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly erpClient: ErpClientService,
  ) {}

  private normalizeType(type: string): string {
    const upper = type.trim().toUpperCase();
    if (upper === "ERP") return "SCHOOL_ERP";
    if (upper === "ADMISSION") return "ADMISSION_GATEWAY";
    return upper;
  }

  private sanitizeIntegration<T extends { credentials?: any }>(
    integration: T,
  ): T {
    if (!integration) return integration;
    const rawCreds = (integration.credentials as Record<string, any>) || {};
    const {
      apiKey,
      apiKeyEncrypted,
      webhookSecret,
      webhookSecretEncrypted,
      ...rest
    } = rawCreds;
    const hasApiKey = Boolean(apiKeyEncrypted || apiKey);
    const hasWebhookSecret = Boolean(webhookSecretEncrypted || webhookSecret);

    return {
      ...integration,
      credentials: {
        ...rest,
        hasApiKey,
        apiKeyHint:
          rawCreds.apiKeyHint ||
          (apiKey ? maskApiKey(String(apiKey)) : undefined),
        hasWebhookSecret,
        webhookSecretHint:
          rawCreds.webhookSecretHint ||
          (webhookSecret ? maskApiKey(String(webhookSecret)) : undefined),
      },
    };
  }

  async getActiveErpConfig(schoolId: string): Promise<ActiveErpConfig | null> {
    const integration = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type: "SCHOOL_ERP" },
    });

    if (!integration) return null;
    const creds = (integration.credentials as Record<string, any>) || {};
    const enabled = creds.enabled === true;
    const baseUrl = creds.erpBaseUrl ? String(creds.erpBaseUrl).trim() : "";
    const encryptedOrPlain = creds.apiKeyEncrypted || creds.apiKey;

    if (!enabled || !baseUrl || !encryptedOrPlain) {
      return null;
    }

    try {
      const apiKey = creds.apiKeyEncrypted
        ? decryptSecret(String(creds.apiKeyEncrypted))
        : String(creds.apiKey);

      if (!apiKey) return null;

      return {
        baseUrl: normalizeErpBaseUrl(baseUrl),
        apiKey,
        tenantId: creds.tenantId ? String(creds.tenantId) : undefined,
        schoolName: creds.erpSchoolName
          ? String(creds.erpSchoolName)
          : undefined,
        subdomain: creds.erpSubdomain ? String(creds.erpSubdomain) : undefined,
        enabled: true,
      };
    } catch {
      return null;
    }
  }

  async getIntegrations(schoolId: string) {
    let integrations = await this.prisma.schoolIntegration.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" },
    });

    if (integrations.length === 0) {
      const defaultData = [
        {
          schoolId,
          type: "SCHOOL_ERP",
          name: "School ERP System",
          status: "INACTIVE",
          credentials: {
            enabled: false,
          },
          syncHistory: [
            {
              action: "ERP integration initialized",
              detail:
                "Add your ERP API Base URL and Website API Key (x-website-key) to enable live sync.",
              timestamp: new Date().toISOString(),
              status: "PENDING",
            },
          ],
        },
        {
          schoolId,
          type: "ADMISSION_GATEWAY",
          name: "Admission API Gateway",
          status: "CONNECTED",
          lastSyncAt: new Date(),
          syncHistory: [
            {
              action: "Admission gateway ready",
              detail:
                "Standalone admission portal active. Connects automatically when School ERP is enabled.",
              timestamp: new Date().toISOString(),
              status: "HEALTHY",
            },
          ],
        },
      ];

      await this.prisma.schoolIntegration.createMany({
        data: defaultData,
      });

      integrations = await this.prisma.schoolIntegration.findMany({
        where: { schoolId },
        orderBy: { createdAt: "asc" },
      });
    }

    return integrations.map((item) => this.sanitizeIntegration(item));
  }

  async configureIntegration(schoolId: string, dto: ConfigureIntegrationDto) {
    const normalizedType = this.normalizeType(dto.type);
    const existing = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type: normalizedType },
    });

    const prevCreds = (existing?.credentials as Record<string, any>) || {};
    const incomingCreds = dto.credentials || {};
    const mergedCreds: Record<string, any> = {
      ...prevCreds,
      ...incomingCreds,
    };

    if (typeof incomingCreds.erpBaseUrl === "string") {
      mergedCreds.erpBaseUrl = normalizeErpBaseUrl(incomingCreds.erpBaseUrl);
    }

    // Never persist plaintext apiKey or webhookSecret; encrypt and keep masked hints
    if (
      typeof incomingCreds.apiKey === "string" &&
      incomingCreds.apiKey.trim()
    ) {
      const cleanKey = incomingCreds.apiKey.trim();
      mergedCreds.apiKeyEncrypted = encryptSecret(cleanKey);
      mergedCreds.apiKeyHint = maskApiKey(cleanKey);
    }
    delete mergedCreds.apiKey;
    delete mergedCreds.hasApiKey;

    if (
      typeof incomingCreds.webhookSecret === "string" &&
      incomingCreds.webhookSecret.trim()
    ) {
      const cleanSecret = incomingCreds.webhookSecret.trim();
      mergedCreds.webhookSecretEncrypted = encryptSecret(cleanSecret);
      mergedCreds.webhookSecretHint = maskApiKey(cleanSecret);
    }
    delete mergedCreds.webhookSecret;
    delete mergedCreds.hasWebhookSecret;

    if (normalizedType === "SCHOOL_ERP") {
      this.erpClient.clearClassesCache(schoolId);
    }

    const nextStatus =
      dto.status ||
      (mergedCreds.enabled === false
        ? "INACTIVE"
        : mergedCreds.erpBaseUrl && mergedCreds.apiKeyEncrypted
          ? "CONNECTED"
          : existing?.status || "INACTIVE");

    if (existing) {
      const updated = await this.prisma.schoolIntegration.update({
        where: { id: existing.id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          status: nextStatus,
          credentials: mergedCreds,
        },
      });
      return this.sanitizeIntegration(updated);
    }

    const created = await this.prisma.schoolIntegration.create({
      data: {
        schoolId,
        type: normalizedType,
        name: dto.name || normalizedType,
        status: nextStatus,
        credentials: mergedCreds,
      },
    });
    return this.sanitizeIntegration(created);
  }

  async testErpConnection(schoolId: string, dto?: TestErpConnectionDto) {
    let existing = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type: "SCHOOL_ERP" },
    });

    const prevCreds = (existing?.credentials as Record<string, any>) || {};
    const baseUrl = dto?.erpBaseUrl?.trim()
      ? normalizeErpBaseUrl(dto.erpBaseUrl)
      : prevCreds.erpBaseUrl
        ? normalizeErpBaseUrl(String(prevCreds.erpBaseUrl))
        : "";

    let apiKey = dto?.apiKey?.trim() || "";
    if (!apiKey && prevCreds.apiKeyEncrypted) {
      apiKey = decryptSecret(String(prevCreds.apiKeyEncrypted));
    } else if (!apiKey && prevCreds.apiKey) {
      apiKey = String(prevCreds.apiKey);
    }

    if (!baseUrl) {
      throw new BadRequestException(
        "ERP API Base URL is required before testing connection.",
      );
    }
    if (!apiKey) {
      throw new BadRequestException(
        "ERP Website API Key (x-website-key) is required before testing connection.",
      );
    }

    try {
      const testResult = await this.erpClient.testConnection(baseUrl, apiKey);

      const nextCreds: Record<string, any> = {
        ...prevCreds,
        erpBaseUrl: baseUrl,
        apiKeyEncrypted: encryptSecret(apiKey),
        apiKeyHint: maskApiKey(apiKey),
        enabled: dto?.enabled ?? prevCreds.enabled ?? true,
        tenantId: testResult.tenantId,
        erpSchoolName: testResult.schoolName,
        erpSubdomain: testResult.subdomain,
        openClassesCount: testResult.openClassesCount ?? 0,
        lastVerifiedAt: new Date().toISOString(),
      };
      delete nextCreds.apiKey;
      delete nextCreds.hasApiKey;

      const historyEntry = {
        action: "ERP Live Connection Test",
        detail: `Connected to ${testResult.schoolName || "ERP"} (${testResult.openClassesCount ?? 0} open classes)`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      };

      const nextHistory = [
        historyEntry,
        ...((existing?.syncHistory as any[]) || []),
      ].slice(0, 15);

      if (existing) {
        existing = await this.prisma.schoolIntegration.update({
          where: { id: existing.id },
          data: {
            status: nextCreds.enabled ? "CONNECTED" : "INACTIVE",
            credentials: nextCreds,
            lastSyncAt: new Date(),
            syncHistory: nextHistory,
          },
        });
      } else {
        existing = await this.prisma.schoolIntegration.create({
          data: {
            schoolId,
            type: "SCHOOL_ERP",
            name: "School ERP System",
            status: nextCreds.enabled ? "CONNECTED" : "INACTIVE",
            credentials: nextCreds,
            lastSyncAt: new Date(),
            syncHistory: nextHistory,
          },
        });
      }

      this.erpClient.clearClassesCache(schoolId);

      return {
        ...testResult,
        connected: testResult.connected ?? true,
        integration: this.sanitizeIntegration(existing),
      };
    } catch (error: any) {
      if (existing) {
        const failedHistory = [
          {
            action: "ERP Live Connection Test",
            detail: error?.message || "Connection test failed",
            timestamp: new Date().toISOString(),
            status: "ERROR",
          },
          ...((existing.syncHistory as any[]) || []),
        ].slice(0, 15);

        await this.prisma.schoolIntegration.update({
          where: { id: existing.id },
          data: {
            status: "ERROR",
            syncHistory: failedHistory,
          },
        });
      }
      throw error;
    }
  }

  async triggerSync(schoolId: string, type: string) {
    const normalizedType = this.normalizeType(type);
    const integration = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type: normalizedType },
    });

    if (!integration) {
      throw new NotFoundException(`Integration '${normalizedType}' not found`);
    }

    const activeErp = await this.getActiveErpConfig(schoolId);
    let detail = "Sync executed successfully. All records up to date.";
    let status = "CONNECTED";

    if (normalizedType === "SCHOOL_ERP") {
      if (activeErp) {
        const [testRes, classes, teachersResult, noticesResult] =
          await Promise.all([
            this.erpClient.testConnection(activeErp.baseUrl, activeErp.apiKey),
            this.erpClient.getPublicClasses(
              activeErp.baseUrl,
              activeErp.apiKey,
              schoolId,
              true,
            ),
            this.erpClient
              .getPublicTeachers(activeErp.baseUrl, activeErp.apiKey)
              .catch((err) => {
                this.logger.warn(
                  `ERP public teachers sync skipped: ${err?.message}`,
                );
                return null;
              }),
            this.erpClient
              .getPublicNotices(activeErp.baseUrl, activeErp.apiKey)
              .catch((err) => {
                this.logger.warn(
                  `ERP public notices sync skipped: ${err?.message}`,
                );
                return null;
              }),
          ]);

        let syncedTeachers = 0;
        if (Array.isArray(teachersResult)) {
          for (const t of teachersResult) {
            const fullName = (
              t.name ||
              [t.firstName, t.lastName].filter(Boolean).join(" ")
            ).trim();
            if (!fullName) continue;
            const existingTeacher = await this.prisma.teacher.findFirst({
              where: {
                schoolId,
                name: { equals: fullName, mode: "insensitive" },
              },
            });
            if (existingTeacher) {
              await this.prisma.teacher.update({
                where: { id: existingTeacher.id },
                data: {
                  designation: t.designation || existingTeacher.designation,
                  department: t.department || existingTeacher.department,
                  qualification:
                    t.qualification ?? existingTeacher.qualification,
                  photoUrl:
                    t.photoUrl || t.avatarUrl || existingTeacher.photoUrl,
                  bio: t.bio ?? existingTeacher.bio,
                  status: "ACTIVE",
                },
              });
            } else {
              await this.prisma.teacher.create({
                data: {
                  schoolId,
                  name: fullName,
                  designation: t.designation || "Faculty Member",
                  department: t.department || "General",
                  qualification: t.qualification || null,
                  photoUrl: t.photoUrl || t.avatarUrl || null,
                  bio: t.bio || null,
                  status: "ACTIVE",
                },
              });
            }
            syncedTeachers++;
          }
        }

        let syncedNotices = 0;
        if (Array.isArray(noticesResult)) {
          for (const n of noticesResult) {
            const title = (n.title || "").trim();
            if (!title) continue;
            const slug =
              n.slug ||
              `erp-${title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
                .slice(0, 60)}`;
            const existingNotice = await this.prisma.notice.findFirst({
              where: {
                schoolId,
                OR: [{ slug }, { title: { equals: title, mode: "insensitive" } }],
              },
            });
            const description =
              n.description || n.content || "Official school notice.";
            if (existingNotice) {
              await this.prisma.notice.update({
                where: { id: existingNotice.id },
                data: {
                  category: n.category || existingNotice.category,
                  description,
                  fileUrl:
                    n.fileUrl || n.attachmentUrl || existingNotice.fileUrl,
                  isPinned: n.isPinned ?? existingNotice.isPinned,
                  priority: n.priority || existingNotice.priority,
                  status: PublishStatus.PUBLISHED,
                },
              });
            } else {
              await this.prisma.notice.create({
                data: {
                  schoolId,
                  title,
                  slug,
                  category: n.category || "General",
                  description,
                  fileUrl: n.fileUrl || n.attachmentUrl || null,
                  isPinned: Boolean(n.isPinned),
                  priority: n.priority || "NORMAL",
                  status: PublishStatus.PUBLISHED,
                  publishDate: n.publishDate
                    ? new Date(n.publishDate)
                    : n.createdAt
                      ? new Date(n.createdAt)
                      : new Date(),
                  expiryDate: n.expiryDate ? new Date(n.expiryDate) : null,
                },
              });
            }
            syncedNotices++;
          }
        }

        const pendingSync = await this.syncPendingAdmissions(
          schoolId,
          activeErp,
        );
        const pendingSummary =
          pendingSync.syncedCount > 0 || pendingSync.failedCount > 0
            ? `, ${pendingSync.syncedCount} queued admission(s) pushed`
            : "";

        detail = `Live ERP (${testRes.schoolName}) synced: ${classes.length} class(es), ${syncedTeachers} teacher(s), ${syncedNotices} notice(s)${pendingSummary}.`;
      } else {
        const [teacherCount, noticeCount] = await Promise.all([
          this.prisma.teacher.count({ where: { schoolId } }),
          this.prisma.notice.count({ where: { schoolId } }),
        ]);
        detail = `Local mode: ${teacherCount} faculty profiles and ${noticeCount} bulletins verified. Configure ERP API Key for live ERP sync.`;
        status = "INACTIVE";
      }
    } else if (normalizedType === "ADMISSION_GATEWAY") {
      const appCount = await this.prisma.admissionApplication.count({
        where: { schoolId },
      });
      if (activeErp) {
        const [classes, pendingSync] = await Promise.all([
          this.erpClient.getPublicClasses(
            activeErp.baseUrl,
            activeErp.apiKey,
            schoolId,
            true,
          ),
          this.syncPendingAdmissions(schoolId, activeErp),
        ]);
        const queuedMsg =
          pendingSync.syncedCount > 0
            ? ` ${pendingSync.syncedCount} queued offline admission(s) synced to ERP.`
            : "";
        detail = `ERP Admission Gateway healthy. ${classes.length} open class(es) loaded and ${appCount} application record(s) verified.${queuedMsg}`;
      } else {
        detail = `${appCount} local student application record(s) verified (Standalone mode).`;
      }
    }

    const newHistory = [
      {
        action: `${integration.name} sync`,
        detail,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      },
      ...((integration.syncHistory as any[]) || []),
    ].slice(0, 15);

    const updated = await this.prisma.schoolIntegration.update({
      where: { id: integration.id },
      data: {
        status,
        lastSyncAt: new Date(),
        syncHistory: newHistory,
      },
    });

    return this.sanitizeIntegration(updated);
  }

  async handleErpWebhook(
    schoolIdOrSlug: string,
    rawBody: string | Buffer,
    payload: Record<string, any>,
    signatureHeader?: string,
  ) {
    const cleanId = schoolIdOrSlug.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cleanId,
      );

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug: cleanId.toLowerCase() }, ...(isUuid ? [{ id: cleanId }] : [])],
        deletedAt: null,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${schoolIdOrSlug}' not found`);
    }

    const integration = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId: school.id, type: "SCHOOL_ERP" },
    });

    const creds = (integration?.credentials as Record<string, any>) || {};
    const storedSecret = creds.webhookSecretEncrypted
      ? decryptSecret(String(creds.webhookSecretEncrypted))
      : creds.webhookSecret
        ? String(creds.webhookSecret)
        : "";

    if (storedSecret) {
      const valid = verifyHmacSha256Signature(
        rawBody,
        storedSecret,
        signatureHeader,
      );
      if (!valid) {
        throw new UnauthorizedException("Invalid X-ERP-Signature HMAC header.");
      }
    }

    const eventName = String(payload.event || "admission.status_updated");
    const data = (payload.data as Record<string, any>) || payload;
    const applicationNumber = String(data.applicationNumber || "").trim();
    const rawStatus = String(data.status || "").trim().toUpperCase();
    const notes = data.notes ?? data.adminNotes ?? data.remarks;
    const interviewDate = data.interviewDate;

    let updatedMirror = false;
    if (applicationNumber) {
      const existingApp = await this.prisma.admissionApplication.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { applicationNumber },
            { erpApplicationNumber: applicationNumber },
          ],
        },
      });

      if (existingApp) {
        const nextStatus = VALID_ADMISSION_STATUSES.has(rawStatus)
          ? (rawStatus as AdmissionStatus)
          : existingApp.status;

        await this.prisma.admissionApplication.update({
          where: { id: existingApp.id },
          data: {
            status: nextStatus,
            ...(notes !== undefined ? { notes: String(notes) } : {}),
            ...(interviewDate
              ? { interviewDate: new Date(interviewDate) }
              : {}),
          },
        });
        updatedMirror = true;
      }
    }

    if (integration) {
      const historyEntry = {
        action: `ERP Webhook (${eventName})`,
        detail: applicationNumber
          ? `${applicationNumber} → ${rawStatus || "UPDATED"}${updatedMirror ? " (mirror updated)" : ""}`
          : "Webhook event received",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      };
      const nextHistory = [
        historyEntry,
        ...((integration.syncHistory as any[]) || []),
      ].slice(0, 15);

      await this.prisma.schoolIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          syncHistory: nextHistory,
        },
      });
    }

    return {
      received: true,
      event: eventName,
      applicationNumber: applicationNumber || null,
      updatedMirror,
    };
  }

  async syncPendingAdmissions(
    schoolId: string,
    erpConfig: ActiveErpConfig,
  ): Promise<{ syncedCount: number; failedCount: number }> {
    const pendingApps = await this.prisma.admissionApplication.findMany({
      where: { schoolId, externalSource: "ERP_PENDING_SYNC" },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    let syncedCount = 0;
    let failedCount = 0;

    for (const app of pendingApps) {
      const nameParts = app.studentName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Student";
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

      const upperGender = (app.gender || "").toUpperCase();
      const gender: "MALE" | "FEMALE" | "OTHER" =
        upperGender === "MALE"
          ? "MALE"
          : upperGender === "FEMALE"
            ? "FEMALE"
            : "OTHER";

      const upperRel = (app.guardianRelationship || "").toUpperCase();
      const relationship = upperRel.includes("FATHER")
        ? "FATHER"
        : upperRel.includes("MOTHER")
          ? "MOTHER"
          : "GUARDIAN";

      const isUuidClass = Boolean(
        app.appliedClassId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            app.appliedClassId,
          ),
      );

      const docsObj = app.documents as Record<string, any> | null;
      const idempotencyKey = buildIdempotencyKey([
        "pending-sync",
        schoolId,
        app.id,
      ]);

      try {
        const erpResult = await this.erpClient.submitAdmission(
          erpConfig.baseUrl,
          erpConfig.apiKey,
          {
            firstName,
            lastName,
            dob: app.dateOfBirth.toISOString().slice(0, 10),
            gender,
            phone: (app.studentPhone || app.guardianPhone).trim(),
            guardianName: app.guardianName.trim(),
            guardianPhone: app.guardianPhone.trim(),
            ...(isUuidClass && app.appliedClassId
              ? { appliedClassId: app.appliedClassId }
              : {}),
            ...(app.studentEmail ? { email: app.studentEmail } : {}),
            ...(app.guardianEmail &&
            app.guardianEmail !== "not-provided@school.local"
              ? { guardianEmail: app.guardianEmail }
              : {}),
            relationship,
            ...(app.bloodGroup ? { bloodGroup: app.bloodGroup } : {}),
            ...(app.previousSchool
              ? { previousSchool: app.previousSchool }
              : {}),
            ...(app.address ? { address: app.address } : {}),
            ...(docsObj?.documentsUrl
              ? { documentsUrl: String(docsObj.documentsUrl) }
              : {}),
          },
          idempotencyKey,
        );

        const nextStatus = VALID_ADMISSION_STATUSES.has(
          String(erpResult.status || "").toUpperCase(),
        )
          ? (String(erpResult.status).toUpperCase() as AdmissionStatus)
          : AdmissionStatus.PENDING;

        await this.prisma.admissionApplication.update({
          where: { id: app.id },
          data: {
            externalSource: "ERP",
            externalApplicationId: erpResult.id || null,
            erpApplicationNumber:
              erpResult.applicationNumber || app.applicationNumber,
            status: nextStatus,
            notes:
              app.notes === "Queued for automatic ERP synchronization."
                ? null
                : app.notes,
          },
        });
        syncedCount++;
      } catch (err: any) {
        this.logger.warn(
          `Failed to sync queued admission ${app.applicationNumber} to ERP: ${err?.message}`,
        );
        failedCount++;
      }
    }

    return { syncedCount, failedCount };
  }
}
