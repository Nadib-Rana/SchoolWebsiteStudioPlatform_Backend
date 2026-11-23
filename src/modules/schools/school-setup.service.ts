import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateSchoolDto, OnboardingDto } from "./dto/school.dto";
import { SchoolPlan, SchoolRole, PublishStatus } from "@prisma/client";

const DEFAULT_STANDARD_PAGES = [
  { slug: "home", title: "Home", navLabel: "Home", isHome: true, order: 1 },
  { slug: "about", title: "About Us", navLabel: "About", isHome: false, order: 2 },
  { slug: "academics", title: "Academics", navLabel: "Academics", isHome: false, order: 3 },
  { slug: "admissions", title: "Admissions", navLabel: "Admissions", isHome: false, order: 4 },
  { slug: "teachers", title: "Teachers", navLabel: "Faculty", isHome: false, order: 5 },
  { slug: "notices", title: "Notices", navLabel: "Notices", isHome: false, order: 6 },
  { slug: "events", title: "Events", navLabel: "Events", isHome: false, order: 7 },
  { slug: "gallery", title: "Gallery", navLabel: "Gallery", isHome: false, order: 8 },
  { slug: "contact", title: "Contact Us", navLabel: "Contact", isHome: false, order: 9 },
] as const;

@Injectable()
export class SchoolSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchool(userId: string, dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findFirst({
      where: {
        OR: [
          { slug: dto.slug.toLowerCase().trim() },
          dto.customDomain ? { customDomain: dto.customDomain } : {},
        ],
      },
    });

    if (existing) {
      throw new ConflictException("School slug or domain already registered");
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug.toLowerCase().trim(),
        customDomain: dto.customDomain || null,
        logoUrl: dto.logoUrl || null,
        plan: dto.plan || SchoolPlan.PROFESSIONAL,
        isPublished: true,
      },
    });

    const existingCount = await this.prisma.schoolMember.count({
      where: { userId },
    });

    await this.prisma.schoolMember.create({
      data: {
        schoolId: school.id,
        userId,
        role: SchoolRole.OWNER,
        isDefault: existingCount === 0,
      },
    });

    await this.prisma.schoolProfile.create({
      data: {
        schoolId: school.id,
        established: new Date().getFullYear(),
        shortBio: `Welcome to ${dto.name}. We provide high quality education and student empowerment.`,
      },
    });

    await this.prisma.schoolThemeConfig.create({
      data: {
        schoolId: school.id,
        activeTheme: "theme-classic",
        selectedTemplate: "tpl-classic",
        primaryColor: "#1E3A8A",
        secondaryColor: "#0D9488",
        accentColor: "#F59E0B",
      },
    });

    await this.prisma.seoConfig.create({
      data: {
        schoolId: school.id,
        siteTitle: `${dto.name} | Official Website`,
        tagline: "Inspiring Excellence, Leadership & Innovation",
        metaDescription: `Welcome to ${dto.name}. Explore academic programs, faculty, admissions and campus life.`,
      },
    });

    await this.prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        allowPublicAdmission: true,
      },
    });

    for (const p of DEFAULT_STANDARD_PAGES) {
      await this.prisma.webPage.create({
        data: {
          schoolId: school.id,
          slug: p.slug,
          title: p.title,
          navLabel: p.navLabel,
          isHome: p.isHome,
          order: p.order,
          status: PublishStatus.PUBLISHED,
        },
      });
    }

    return school;
  }

  async onboarding(userId: string, dto: OnboardingDto) {
    const existing = await this.prisma.school.findFirst({
      where: { slug: dto.slug.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException("A school with this slug already exists");
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug.toLowerCase().trim(),
        logoUrl: dto.logoUrl || null,
        plan: SchoolPlan.PROFESSIONAL,
        isPublished: true,
      },
    });

    await this.prisma.schoolMember.create({
      data: {
        schoolId: school.id,
        userId,
        role: SchoolRole.OWNER,
        isDefault: true,
      },
    });

    const estYear = dto.establishedYear
      ? parseInt(dto.establishedYear, 10) || new Date().getFullYear()
      : new Date().getFullYear();

    await this.prisma.schoolProfile.create({
      data: {
        schoolId: school.id,
        principalName: dto.principalName || "Principal",
        principalTitle: dto.principalTitle || "Principal",
        email: dto.contactEmail || null,
        phone: dto.contactPhone || null,
        address: dto.address || null,
        established: estYear,
        shortBio:
          dto.shortBio ||
          `Welcome to ${dto.name}. We provide high quality education and student empowerment.`,
        ...(dto.academicOverview
          ? { academics: { curriculum: dto.academicOverview } }
          : {}),
      },
    });

    await this.prisma.schoolThemeConfig.create({
      data: {
        schoolId: school.id,
        activeTheme: dto.themePreset || "theme-modern",
        selectedTemplate: dto.templateId || "Aster Academy",
        primaryColor: dto.primaryColor || "#1E3A8A",
        secondaryColor: dto.secondaryColor || dto.accentColor || "#E3AD3F",
        accentColor: dto.accentColor || dto.secondaryColor || "#E3AD3F",
      },
    });

    await this.prisma.seoConfig.create({
      data: {
        schoolId: school.id,
        siteTitle: `${dto.name} | Official Website`,
        metaDescription:
          dto.shortBio ||
          `Welcome to ${dto.name}. Explore academic programs, faculty, admissions and campus life.`,
      },
    });

    await this.prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        contactEmail: dto.contactEmail || null,
        supportPhone: dto.contactPhone || null,
        allowPublicAdmission: true,
      },
    });

    const pagesToCreate = dto.selectedPages?.length
      ? dto.selectedPages
      : [
          "home",
          "about",
          "academics",
          "admissions",
          "teachers",
          "notices",
          "events",
          "gallery",
          "contact",
        ];

    let order = 1;
    for (const pageSlug of pagesToCreate) {
      const std = DEFAULT_STANDARD_PAGES.find((p) => p.slug === pageSlug);
      const title =
        std?.title ||
        pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1).replace("-", " ");
      const navLabel = std?.navLabel || title;
      await this.prisma.webPage.create({
        data: {
          schoolId: school.id,
          slug: pageSlug,
          title,
          navLabel,
          isHome: pageSlug === "home",
          order: order++,
          status: PublishStatus.PUBLISHED,
        },
      });
    }

    const headerMenu = await this.prisma.navigationMenu.create({
      data: {
        schoolId: school.id,
        location: "HEADER",
      },
    });

    let navOrder = 1;
    for (const p of DEFAULT_STANDARD_PAGES) {
      if (pagesToCreate.includes(p.slug)) {
        await this.prisma.navigationMenuItem.create({
          data: {
            menuId: headerMenu.id,
            label: p.navLabel,
            url: p.isHome ? "/" : `/${p.slug}`,
            pageSlug: p.slug,
            order: navOrder++,
            isExternal: false,
          },
        });
      }
    }

    return school;
  }
}
