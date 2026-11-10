import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateSeoDto } from "./dto/seo.dto";

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getSeoConfig(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        logoUrl: true,
        faviconUrl: true,
      },
    });

    let config = await this.prisma.seoConfig.findUnique({
      where: { schoolId },
    });

    if (!config) {
      config = await this.prisma.seoConfig.create({
        data: {
          schoolId,
          siteTitle: `${school?.name || "School"} | Official Website`,
          tagline: "Inspiring Excellence in Education",
          metaDescription: `Official website of ${school?.name || "our school"}. Explore academic programs, news, and campus life.`,
          metaKeywords: ["Education", "School", "Admissions", "Academics"],
          ogImageUrl: school?.logoUrl || null,
        },
      });
    }

    const canonicalUrl = school?.customDomain
      ? `https://${school.customDomain}`
      : `https://${school?.slug}.schoolcanvas.app`;

    return {
      ...config,
      canonicalUrl,
      schoolName: school?.name,
      schoolLogo: school?.logoUrl,
      schoolFavicon: school?.faviconUrl,
    };
  }

  async updateSeoConfig(schoolId: string, dto: UpdateSeoDto) {
    await this.getSeoConfig(schoolId);

    const updated = await this.prisma.seoConfig.update({
      where: { schoolId },
      data: {
        ...(dto.siteTitle !== undefined ? { siteTitle: dto.siteTitle } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
        ...(dto.metaKeywords !== undefined ? { metaKeywords: dto.metaKeywords } : {}),
        ...(dto.ogImageUrl !== undefined ? { ogImageUrl: dto.ogImageUrl } : {}),
        ...(dto.googleAnalyticsId !== undefined ? { googleAnalyticsId: dto.googleAnalyticsId } : {}),
        ...(dto.searchConsoleTag !== undefined ? { searchConsoleTag: dto.searchConsoleTag } : {}),
        ...(dto.robotsTxt !== undefined ? { robotsTxt: dto.robotsTxt } : {}),
        ...(dto.sitemapEnabled !== undefined ? { sitemapEnabled: dto.sitemapEnabled } : {}),
      },
    });

    return updated;
  }
}
