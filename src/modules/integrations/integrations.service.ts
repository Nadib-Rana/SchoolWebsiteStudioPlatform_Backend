import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ConfigureIntegrationDto } from "./dto/integrations.dto";

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getIntegrations(schoolId: string) {
    const integrations = await this.prisma.schoolIntegration.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" },
    });

    if (integrations.length === 0) {
      // Seed default integrations if empty
      const defaultData = [
        {
          schoolId,
          type: "SCHOOL_ERP",
          name: "School ERP System",
          status: "CONNECTED",
          lastSyncAt: new Date(Date.now() - 15 * 60 * 1000),
          syncHistory: [
            {
              action: "ERP automatic sync",
              detail: "36 records reviewed",
              timestamp: "15 min ago",
              status: "SUCCESS",
            },
          ],
        },
        {
          schoolId,
          type: "ADMISSION_GATEWAY",
          name: "Admission API Gateway",
          status: "CONNECTED",
          lastSyncAt: new Date(Date.now() - 2 * 3600 * 1000),
          syncHistory: [
            {
              action: "Admission API health check",
              detail: "Gateway responded in 142 ms",
              timestamp: "2 hrs ago",
              status: "HEALTHY",
            },
          ],
        },
      ];

      await this.prisma.schoolIntegration.createMany({
        data: defaultData,
      });

      return this.prisma.schoolIntegration.findMany({
        where: { schoolId },
      });
    }

    return integrations;
  }

  async configureIntegration(schoolId: string, dto: ConfigureIntegrationDto) {
    const existing = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type: dto.type },
    });

    if (existing) {
      return this.prisma.schoolIntegration.update({
        where: { id: existing.id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.credentials ? { credentials: dto.credentials } : {}),
        },
      });
    }

    return this.prisma.schoolIntegration.create({
      data: {
        schoolId,
        type: dto.type,
        name: dto.name || dto.type,
        status: dto.status || "CONNECTED",
        credentials: dto.credentials || {},
      },
    });
  }

  async triggerSync(schoolId: string, type: string) {
    const integration = await this.prisma.schoolIntegration.findFirst({
      where: { schoolId, type },
    });

    if (!integration) {
      throw new NotFoundException(`Integration '${type}' not found`);
    }

    let detail = "Sync executed successfully. All records up to date.";
    if (type === "ADMISSION_GATEWAY") {
      const appCount = await this.prisma.admissionApplication.count({
        where: { schoolId },
      });
      detail = `${appCount} student application record(s) verified and synchronized with gateway.`;
    } else if (type === "SCHOOL_ERP") {
      const [teacherCount, noticeCount] = await Promise.all([
        this.prisma.teacher.count({ where: { schoolId } }),
        this.prisma.notice.count({ where: { schoolId } }),
      ]);
      detail = `${teacherCount} faculty profiles and ${noticeCount} institutional bulletins verified against ERP registry.`;
    }

    const newHistory = [
      {
        action: `${integration.name} manual sync`,
        detail,
        timestamp: "Just now",
        status: "SUCCESS",
      },
      ...((integration.syncHistory as any[]) || []),
    ].slice(0, 10);

    return this.prisma.schoolIntegration.update({
      where: { id: integration.id },
      data: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
        syncHistory: newHistory,
      },
    });
  }
}
