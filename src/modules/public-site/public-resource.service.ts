import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { PublishStatus } from "@prisma/client";

@Injectable()
export class PublicResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchPublishedResources(schoolId: string) {
    const [pages, teachers, notices, events, albums, menu] = await Promise.all([
      this.prisma.webPage.findMany({
        where: {
          schoolId,
          status: PublishStatus.PUBLISHED,
        },
        include: {
          sections: {
            where: { isVisible: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      }),
      this.prisma.teacher.findMany({
        where: {
          schoolId,
          status: "ACTIVE",
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      this.prisma.notice.findMany({
        where: {
          schoolId,
          status: PublishStatus.PUBLISHED,
        },
        orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
        take: 50,
      }),
      this.prisma.schoolEvent.findMany({
        where: {
          schoolId,
          status: PublishStatus.PUBLISHED,
        },
        orderBy: { eventDate: "asc" },
        take: 50,
      }),
      this.prisma.galleryAlbum.findMany({
        where: { schoolId },
        include: {
          photos: {
            orderBy: { order: "asc" },
            take: 50,
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        take: 20,
      }),
      this.prisma.navigationMenu.findFirst({
        where: { schoolId, location: "HEADER" },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
        },
      }),
    ]);

    return {
      pages,
      teachers,
      notices,
      events,
      albums,
      navigation: menu?.items || [],
    };
  }

  async recordVisitorView(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.analyticsDaily
      .upsert({
        where: { schoolId_date: { schoolId, date: today } },
        update: {
          pageViews: { increment: 1 },
        },
        create: {
          schoolId,
          date: today,
          pageViews: 1,
          uniqueVisitors: 1,
        },
      })
      .catch(() => {});
  }

  async getPublicNotice(schoolId: string, noticeIdOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        noticeIdOrSlug,
      );
    const notice = await this.prisma.notice.findFirst({
      where: {
        schoolId,
        status: PublishStatus.PUBLISHED,
        OR: [
          { slug: noticeIdOrSlug },
          ...(isUuid ? [{ id: noticeIdOrSlug }] : []),
        ],
      },
    });
    if (!notice) throw new NotFoundException("Notice not found");
    return notice;
  }

  async getPublicEvent(schoolId: string, eventId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: {
        id: eventId,
        schoolId,
        status: PublishStatus.PUBLISHED,
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async getPublicTeacher(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
        status: "ACTIVE",
      },
    });
    if (!teacher) throw new NotFoundException("Teacher not found");
    return teacher;
  }

  async getPublicAlbum(schoolId: string, albumIdOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        albumIdOrSlug,
      );
    const album = await this.prisma.galleryAlbum.findFirst({
      where: {
        schoolId,
        OR: [
          { slug: albumIdOrSlug },
          ...(isUuid ? [{ id: albumIdOrSlug }] : []),
        ],
      },
      include: {
        photos: {
          orderBy: { order: "asc" },
        },
      },
    });
    if (!album) throw new NotFoundException("Album not found");
    return album;
  }
}
