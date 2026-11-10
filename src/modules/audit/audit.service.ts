import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export interface CreateAuditLogParams {
  userId?: string;
  schoolId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams) {
    try {
      const mergedDetails = {
        ...(params.details || {}),
        schoolId: params.schoolId,
      };

      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || params.schoolId,
          details: mergedDetails,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log: ${err.message}`);
      return null;
    }
  }

  async getSchoolLogs(schoolId: string, limit = 50) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: schoolId },
          { details: { path: ["schoolId"], equals: schoolId } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (logs.length > 0) {
      return logs.map((log) => {
        const first = log.user?.firstName || "";
        const last = log.user?.lastName || "";
        const userName = `${first} ${last}`.trim() || log.user?.email || "System Automation";
        const initials = `${first[0] || ""}${last[0] || ""}`.toUpperCase() || "SYS";
        const detailsObj = (log.details as Record<string, any>) || {};

        return {
          id: log.id,
          action: log.action,
          entity: log.entity,
          title: detailsObj.title || `${log.action.replace(/_/g, " ")} on ${log.entity.toLowerCase()}`,
          detail: detailsObj.detail || `${userName} · ${new Date(log.createdAt).toLocaleDateString()}`,
          tone: detailsObj.tone || this.getActionTone(log.action),
          userName,
          userEmail: log.user?.email || null,
          initials,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        };
      });
    }

    // Default seeded activities for fresh workspace
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, createdAt: true },
    });

    return [
      {
        id: "sys-init",
        action: "WORKSPACE_CREATED",
        entity: "SCHOOL",
        title: `${school?.name || "School"} Workspace Initialized`,
        detail: "System Automation · Platform Provisioned",
        tone: "blue",
        userName: "System",
        userEmail: null,
        initials: "SYS",
        createdAt: school?.createdAt || new Date(),
      },
      {
        id: "sys-theme",
        action: "THEME_SYNCED",
        entity: "THEME",
        title: "Theme & Builder Synchronized",
        detail: "Real-time design token pipeline active",
        tone: "violet",
        userName: "Studio Admin",
        userEmail: null,
        initials: "ST",
        createdAt: new Date(),
      },
    ];
  }

  private getActionTone(action: string): string {
    if (action.includes("CREATE") || action.includes("PUBLISH") || action.includes("VERIFY")) return "green";
    if (action.includes("UPDATE") || action.includes("SYNC")) return "blue";
    if (action.includes("INVITE") || action.includes("ROLE")) return "orange";
    if (action.includes("DELETE") || action.includes("REMOVE")) return "rose";
    return "slate";
  }
}
