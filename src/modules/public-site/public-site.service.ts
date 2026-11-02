import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  ContactInquiryDto,
  UpdateInquiryStatusDto,
} from "./dto/public-site.dto";
import { PublishStatus } from "@prisma/client";

@Injectable()
export class PublicSiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicSite(identifier: string) {
    const trimmed = identifier.toLowerCase().trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [
          { slug: trimmed },
          { customDomain: trimmed },
          ...(isUuid ? [{ id: trimmed }] : []),
        ],
        deletedAt: null,
      },
      include: {
        profile: true,
        themeConfig: true,
        seoConfig: true,
        settings: true,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${identifier}' not found`);
    }

    if (!school.isPublished) {
      throw new ForbiddenException(
        "This school website is currently unpublished or in maintenance mode.",
      );
    }

    // Fetch published resources concurrently
    const [pages, teachers, notices, events, albums, menu] = await Promise.all([
      this.prisma.webPage.findMany({
        where: {
          schoolId: school.id,
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
          schoolId: school.id,
          status: "ACTIVE",
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      this.prisma.notice.findMany({
        where: {
          schoolId: school.id,
          status: PublishStatus.PUBLISHED,
        },
        orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
        take: 10,
      }),
      this.prisma.schoolEvent.findMany({
        where: {
          schoolId: school.id,
          status: PublishStatus.PUBLISHED,
        },
        orderBy: { eventDate: "asc" },
        take: 10,
      }),
      this.prisma.galleryAlbum.findMany({
        where: { schoolId: school.id },
        include: {
          photos: {
            take: 8,
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        take: 6,
      }),
      this.prisma.navigationMenu.findFirst({
        where: { schoolId: school.id, location: "HEADER" },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
        },
      }),
    ]);

    // Record visitor view asynchronously in analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    void this.prisma.analyticsDaily
      .upsert({
        where: { schoolId_date: { schoolId: school.id, date: today } },
        update: {
          pageViews: { increment: 1 },
        },
        create: {
          schoolId: school.id,
          date: today,
          pageViews: 1,
          uniqueVisitors: 1,
        },
      })
      .catch(() => {});

    return {
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        customDomain: school.customDomain,
        logoUrl: school.logoUrl,
        faviconUrl: school.faviconUrl,
        isPublished: school.isPublished,
      },
      profile: school.profile,
      theme: school.themeConfig,
      seo: school.seoConfig,
      navigation: menu?.items || [],
      pages,
      teachers,
      notices,
      events,
      albums,
    };
  }

  async createInquiry(dto: ContactInquiryDto) {
    const trimmed = dto.schoolSlug.toLowerCase().trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [
          { slug: trimmed },
          ...(isUuid ? [{ id: trimmed }] : []),
        ],
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${dto.schoolSlug}' not found`);
    }

    return this.prisma.contactInquiry.create({
      data: {
        schoolId: school.id,
        fullName: dto.fullName,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone || null,
        subject: dto.subject,
        message: dto.message,
        status: "NEW",
      },
    });
  }

  async getInquiries(schoolId: string) {
    return this.prisma.contactInquiry.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateInquiryStatus(
    schoolId: string,
    inquiryId: string,
    dto: UpdateInquiryStatusDto,
  ) {
    const inquiry = await this.prisma.contactInquiry.findFirst({
      where: { id: inquiryId, schoolId },
    });

    if (!inquiry) {
      throw new NotFoundException("Contact inquiry not found");
    }

    return this.prisma.contactInquiry.update({
      where: { id: inquiryId },
      data: {
        status: dto.status,
        ...(dto.responseNotes !== undefined
          ? { responseNotes: dto.responseNotes }
          : {}),
      },
    });
  }
}
