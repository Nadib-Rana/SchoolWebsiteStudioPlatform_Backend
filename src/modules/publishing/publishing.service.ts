import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ReleaseVersionDto } from "./dto/publishing.dto";
import { PublishStatus } from "@prisma/client";

@Injectable()
export class PublishingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishingStatus(schoolId: string) {
    const [
      school,
      themeConfig,
      draftPages,
      draftNotices,
      draftEvents,
      versions,
    ] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { isPublished: true, updatedAt: true },
      }),
      this.prisma.schoolThemeConfig.findUnique({
        where: { schoolId },
        select: { draftConfig: true, updatedAt: true },
      }),
      this.prisma.webPage.findMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      this.prisma.notice.findMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        select: { id: true, title: true, updatedAt: true },
      }),
      this.prisma.schoolEvent.findMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        select: { id: true, title: true, updatedAt: true },
      }),
      this.prisma.websiteVersion.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const stagedChanges = [
      ...(themeConfig?.draftConfig
        ? [
            {
              type: "THEME",
              title: "Theme customizer modifications",
              detail: "Colors, typography or template preset changed in draft",
              updatedAt: themeConfig.updatedAt,
            },
          ]
        : []),
      ...draftPages.map((p) => ({
        type: "PAGE",
        title: `Draft Page: ${p.title}`,
        detail: `/${p.slug} awaiting release`,
        updatedAt: p.updatedAt,
      })),
      ...draftNotices.map((n) => ({
        type: "NOTICE",
        title: `Draft Notice: ${n.title}`,
        detail: "Announcement staged for publishing",
        updatedAt: n.updatedAt,
      })),
      ...draftEvents.map((e) => ({
        type: "EVENT",
        title: `Draft Event: ${e.title}`,
        detail: "Event staged for publishing",
        updatedAt: e.updatedAt,
      })),
    ];

    const currentVersion =
      versions.find((v) => v.isCurrent) || versions[0] || null;

    return {
      isPublished: school?.isPublished || false,
      currentVersionTag: currentVersion?.versionTag || "v1.4.2",
      lastPublishedAt: currentVersion?.createdAt || school?.updatedAt,
      stagedChangesCount: stagedChanges.length,
      stagedChanges,
      versions,
    };
  }

  async releaseVersion(
    schoolId: string,
    userId: string,
    dto: ReleaseVersionDto,
  ) {
    // 1. Publish any draft theme FIRST so the version snapshot captures the live published state
    const existingTheme = await this.prisma.schoolThemeConfig.findUnique({
      where: { schoolId },
    });

    if (existingTheme?.draftConfig) {
      const draft = existingTheme.draftConfig as any;
      await this.prisma.schoolThemeConfig.update({
        where: { schoolId },
        data: {
          activeTheme: draft.activeTheme || existingTheme.activeTheme,
          selectedTemplate:
            draft.selectedTemplate || existingTheme.selectedTemplate,
          primaryColor: draft.primaryColor || existingTheme.primaryColor,
          secondaryColor: draft.secondaryColor || existingTheme.secondaryColor,
          accentColor: draft.accentColor || existingTheme.accentColor,
          fontHeading: draft.fontHeading || existingTheme.fontHeading,
          fontBody: draft.fontBody || existingTheme.fontBody,
          buttonRadius: draft.buttonRadius || existingTheme.buttonRadius,
          buttonShadow: draft.buttonShadow || existingTheme.buttonShadow,
          cardStyle: draft.cardStyle || existingTheme.cardStyle,
          headerLayout: draft.headerLayout || existingTheme.headerLayout,
          footerLayout: draft.footerLayout || existingTheme.footerLayout,
          draftConfig: null,
        },
      });
    }

    // 2. Publish draft pages, notices, and events + ensure school is marked as published
    await Promise.all([
      this.prisma.webPage.updateMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        data: { status: PublishStatus.PUBLISHED },
      }),
      this.prisma.notice.updateMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        data: { status: PublishStatus.PUBLISHED },
      }),
      this.prisma.schoolEvent.updateMany({
        where: { schoolId, status: PublishStatus.DRAFT },
        data: { status: PublishStatus.PUBLISHED },
      }),
      this.prisma.school.update({
        where: { id: schoolId },
        data: { isPublished: true },
      }),
    ]);

    // 3. Capture full post-publish snapshot of the site
    const [school, profile, themeConfig, pages, menu] = await Promise.all([
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
    ]);

    const snapshotData = JSON.parse(
      JSON.stringify(
        {
          school,
          profile,
          themeConfig,
          pages,
          menu,
          timestamp: new Date().toISOString(),
        },
        (_key, value) => (typeof value === "bigint" ? Number(value) : value),
      ),
    );

    // 4. Mark older versions as not current and create the new version record
    await this.prisma.websiteVersion.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    const version = await this.prisma.websiteVersion.create({
      data: {
        schoolId,
        versionTag: dto.versionTag,
        summary: dto.summary,
        snapshotData,
        publishedBy: dto.publishedBy || userId || "Administrator",
        isCurrent: true,
      },
    });

    return version;
  }

  async setPublishStatus(schoolId: string, isPublished: boolean) {
    return this.prisma.school.update({
      where: { id: schoolId },
      data: { isPublished },
    });
  }
}
