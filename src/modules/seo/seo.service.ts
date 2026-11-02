import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateSeoDto } from "./dto/seo.dto";

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async getSeoConfig(schoolId: string) {
    const config = await this.prisma.seoConfig.findUnique({
      where: { schoolId },
    });

    if (!config) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      return this.prisma.seoConfig.create({
        data: {
          schoolId,
          siteTitle: `${school?.name || "School"} | Official Website`,
          tagline: "Inspiring Excellence in Education",
          metaDescription: `Official website of ${school?.name || "our school"}. Explore academic programs, news, and campus life.`,
        },
      });
    }

    return config;
  }

  async updateSeoConfig(schoolId: string, dto: UpdateSeoDto) {
    await this.getSeoConfig(schoolId);

    return this.prisma.seoConfig.update({
      where: { schoolId },
      data: dto,
    });
  }
}
