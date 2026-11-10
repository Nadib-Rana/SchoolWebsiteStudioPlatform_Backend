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
import { PublicInquiryService } from "./public-inquiry.service";
import { PublicResourceService } from "./public-resource.service";

@Injectable()
export class PublicSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inquiryService: PublicInquiryService,
    private readonly resourceService: PublicResourceService,
  ) {}

  async getPublishedSchools() {
    return this.prisma.school.findMany({
      where: { isPublished: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async resolvePublishedSchool(identifier: string) {
    const trimmed = identifier.toLowerCase().trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

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

    return school;
  }

  async getPublicSite(identifier: string) {
    const school = await this.resolvePublishedSchool(identifier);
    const resources = await this.resourceService.fetchPublishedResources(
      school.id,
    );
    void this.resourceService.recordVisitorView(school.id);

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
      settings: school.settings,
      navigation: resources.navigation,
      pages: resources.pages,
      teachers: resources.teachers,
      notices: resources.notices,
      events: resources.events,
      albums: resources.albums,
    };
  }

  async createInquiry(dto: ContactInquiryDto) {
    return this.inquiryService.createInquiry(dto);
  }

  async getInquiries(schoolId: string) {
    return this.inquiryService.getInquiries(schoolId);
  }

  async updateInquiryStatus(
    schoolId: string,
    inquiryId: string,
    dto: UpdateInquiryStatusDto,
  ) {
    return this.inquiryService.updateInquiryStatus(schoolId, inquiryId, dto);
  }

  async deleteInquiry(schoolId: string, inquiryId: string) {
    return this.inquiryService.deleteInquiry(schoolId, inquiryId);
  }

  async getPublicNotice(identifier: string, noticeIdOrSlug: string) {
    const school = await this.resolvePublishedSchool(identifier);
    return this.resourceService.getPublicNotice(school.id, noticeIdOrSlug);
  }

  async getPublicEvent(identifier: string, eventId: string) {
    const school = await this.resolvePublishedSchool(identifier);
    return this.resourceService.getPublicEvent(school.id, eventId);
  }

  async getPublicTeacher(identifier: string, teacherId: string) {
    const school = await this.resolvePublishedSchool(identifier);
    return this.resourceService.getPublicTeacher(school.id, teacherId);
  }

  async getPublicAlbum(identifier: string, albumIdOrSlug: string) {
    const school = await this.resolvePublishedSchool(identifier);
    return this.resourceService.getPublicAlbum(school.id, albumIdOrSlug);
  }
}
