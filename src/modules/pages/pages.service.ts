import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreatePageDto,
  UpdatePageDto,
  PageQueryDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from "./dto/pages.dto";
import { PageSectionsService } from "./page-sections.service";

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pageSectionsService: PageSectionsService,
  ) {}

  async getPages(schoolId: string, query: PageQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.webPage.count({ where }),
      this.prisma.webPage.findMany({
        where,
        include: {
          _count: { select: { sections: true } },
        },
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPageById(schoolId: string, pageId: string) {
    const page = await this.prisma.webPage.findFirst({
      where: { id: pageId, schoolId },
      include: {
        sections: { orderBy: { order: "asc" } },
      },
    });

    if (!page) {
      throw new NotFoundException("Web page not found");
    }

    return page;
  }

  async createPage(schoolId: string, dto: CreatePageDto) {
    const existing = await this.prisma.webPage.findUnique({
      where: {
        schoolId_slug: {
          schoolId,
          slug: dto.slug.toLowerCase().trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        "A page with this slug already exists for this school",
      );
    }

    return this.prisma.webPage.create({
      data: {
        schoolId,
        slug: dto.slug.toLowerCase().trim(),
        title: dto.title,
        navLabel: dto.navLabel || dto.title,
        isHome: dto.isHome || false,
        order: dto.order || 0,
        status: dto.status,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: { sections: true },
    });
  }

  async updatePage(schoolId: string, pageId: string, dto: UpdatePageDto) {
    const page = await this.getPageById(schoolId, pageId);

    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.webPage.findUnique({
        where: {
          schoolId_slug: {
            schoolId,
            slug: dto.slug.toLowerCase().trim(),
          },
        },
      });
      if (existing) {
        throw new ConflictException("A page with this slug already exists");
      }
    }

    return this.prisma.webPage.update({
      where: { id: pageId },
      data: {
        ...(dto.slug ? { slug: dto.slug.toLowerCase().trim() } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.navLabel ? { navLabel: dto.navLabel } : {}),
        ...(dto.isHome !== undefined ? { isHome: dto.isHome } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
        ...(dto.metaDescription !== undefined
          ? { metaDescription: dto.metaDescription }
          : {}),
        ...(dto.featuredImage !== undefined
          ? { featuredImage: dto.featuredImage }
          : {}),
      },
      include: {
        sections: { orderBy: { order: "asc" } },
      },
    });
  }

  async deletePage(schoolId: string, pageId: string) {
    const page = await this.getPageById(schoolId, pageId);

    if (page.isHome) {
      throw new ConflictException("The homepage cannot be deleted");
    }

    await this.prisma.webPage.delete({ where: { id: pageId } });
    return { message: "Page deleted successfully" };
  }

  async createSection(schoolId: string, pageId: string, dto: CreateSectionDto) {
    await this.getPageById(schoolId, pageId);
    return this.pageSectionsService.createSection(pageId, dto);
  }

  async updateSection(
    schoolId: string,
    pageId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    await this.getPageById(schoolId, pageId);
    return this.pageSectionsService.updateSection(pageId, sectionId, dto);
  }

  async reorderSections(
    schoolId: string,
    pageId: string,
    dto: ReorderSectionsDto,
  ) {
    await this.getPageById(schoolId, pageId);
    return this.pageSectionsService.reorderSections(pageId, dto);
  }

  async deleteSection(schoolId: string, pageId: string, sectionId: string) {
    await this.getPageById(schoolId, pageId);
    return this.pageSectionsService.deleteSection(pageId, sectionId);
  }
}
