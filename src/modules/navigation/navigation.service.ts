import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateNavigationDto } from "./dto/navigation.dto";

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenus(schoolId: string) {
    const menus = await this.prisma.navigationMenu.findMany({
      where: { schoolId },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (menus.length === 0) {
      // Auto initialize default header menu
      const headerMenu = await this.prisma.navigationMenu.create({
        data: {
          schoolId,
          location: "HEADER",
        },
      });

      const pages = await this.prisma.webPage.findMany({
        where: { schoolId },
        orderBy: { order: "asc" },
      });

      const defaultItems = pages.map((p, index) => ({
        menuId: headerMenu.id,
        label: p.navLabel || p.title,
        url: p.isHome ? "/" : `/${p.slug}`,
        pageSlug: p.slug,
        order: index + 1,
      }));

      await this.prisma.navigationMenuItem.createMany({
        data: defaultItems,
      });

      return this.prisma.navigationMenu.findMany({
        where: { schoolId },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
        },
      });
    }

    return menus;
  }

  async updateMenu(schoolId: string, dto: UpdateNavigationDto) {
    const location = dto.location.toUpperCase();

    const menu = await this.prisma.navigationMenu.upsert({
      where: { schoolId_location: { schoolId, location } },
      update: {},
      create: {
        schoolId,
        location,
      },
    });

    // Replace items
    await this.prisma.navigationMenuItem.deleteMany({
      where: { menuId: menu.id },
    });

    await this.prisma.navigationMenuItem.createMany({
      data: dto.items.map((item, index) => ({
        menuId: menu.id,
        label: item.label,
        url: item.url,
        pageSlug: item.pageSlug || null,
        parentId: item.parentId || null,
        order: item.order !== undefined ? item.order : index + 1,
        isExternal: item.isExternal || false,
        target: item.target || "_self",
      })),
    });

    return this.prisma.navigationMenu.findUnique({
      where: { id: menu.id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });
  }
}
