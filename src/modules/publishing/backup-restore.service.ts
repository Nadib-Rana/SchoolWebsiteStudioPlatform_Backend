import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateBackupDto, RestoreVersionDto } from "./dto/publishing.dto";
import {
  formatSnapshotJson,
  restoreThemeAndProfile,
} from "./backup-restore.helper";

@Injectable()
export class BackupRestoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createBackup(schoolId: string, userId: string, dto: CreateBackupDto) {
    const [school, profile, themeConfig, pages, menu, user] =
      await Promise.all([
        this.prisma.school.findUnique({ where: { id: schoolId } }),
        this.prisma.schoolProfile.findUnique({ where: { schoolId } }),
        this.prisma.schoolThemeConfig.findUnique({ where: { schoolId } }),
        this.prisma.webPage.findMany({
          where: { schoolId },
          include: { sections: true },
        }),
        this.prisma.navigationMenu.findFirst({
          where: { schoolId, location: "HEADER" },
          include: { items: true },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, username: true },
        }),
      ]);

    if (!school) throw new NotFoundException("School not found");

    const publisher = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
      : "Administrator";
    const ts = new Date();
    const tag =
      dto.versionTag ||
      `bk-${ts.toISOString().split("T")[0]}-${ts.getHours()}${ts.getMinutes()}`;

    const snapshotData = formatSnapshotJson({
      school,
      profile,
      themeConfig,
      pages,
      menu,
      notes: dto.notes,
      timestamp: ts.toISOString(),
    });

    const version = await this.prisma.websiteVersion.create({
      data: {
        schoolId,
        versionTag: tag,
        summary: dto.label || dto.notes || "Manual snapshot backup",
        snapshotData,
        publishedBy: publisher,
        isCurrent: false,
      },
    });

    await this.auditService.log({
      schoolId,
      userId,
      action: "BACKUP_CREATED",
      entity: "WebsiteVersion",
      entityId: version.id,
      details: {
        versionTag: tag,
        label: dto.label,
        pageCount: pages.length,
      },
    });

    return version;
  }

  async restoreVersion(
    schoolId: string,
    versionId: string,
    userId: string,
    dto?: RestoreVersionDto,
  ) {
    const version = await this.prisma.websiteVersion.findFirst({
      where: { id: versionId, schoolId },
    });
    if (!version || !version.snapshotData) {
      throw new NotFoundException("Backup version snapshot not found");
    }

    const snapshot = version.snapshotData as any;
    await restoreThemeAndProfile(this.prisma, schoolId, snapshot);

    await this.prisma.websiteVersion.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
    await this.prisma.websiteVersion.update({
      where: { id: version.id },
      data: { isCurrent: true },
    });
    await this.prisma.school.update({
      where: { id: schoolId },
      data: { isPublished: true },
    });

    await this.auditService.log({
      schoolId,
      userId,
      action: "REVISION_RESTORED",
      entity: "WebsiteVersion",
      entityId: version.id,
      details: {
        versionTag: version.versionTag,
        summary: version.summary,
        reason: dto?.reason || "One-click revision rollback",
      },
    });

    return {
      success: true,
      message: `Successfully restored revision ${version.versionTag}`,
      version,
    };
  }

  async getVersionDetails(schoolId: string, versionId: string) {
    const version = await this.prisma.websiteVersion.findFirst({
      where: { id: versionId, schoolId },
    });
    if (!version)
      throw new NotFoundException("Website version snapshot not found");
    return version;
  }

  async deleteVersion(schoolId: string, versionId: string) {
    const version = await this.prisma.websiteVersion.findFirst({
      where: { id: versionId, schoolId },
    });
    if (!version) throw new NotFoundException("Version snapshot not found");
    if (version.isCurrent) {
      throw new BadRequestException(
        "Cannot delete the currently active live version",
      );
    }
    await this.prisma.websiteVersion.delete({ where: { id: versionId } });
    return { success: true };
  }
}
