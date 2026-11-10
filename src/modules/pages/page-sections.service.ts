import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from "./dto/pages.dto";

@Injectable()
export class PageSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSection(pageId: string, dto: CreateSectionDto) {
    const count = await this.prisma.pageSection.count({
      where: { pageId },
    });

    return this.prisma.pageSection.create({
      data: {
        pageId,
        type: dto.type,
        title: dto.title || null,
        content: dto.content || {},
        order: dto.order !== undefined ? dto.order : count + 1,
        isVisible: dto.isVisible ?? true,
        settings: dto.settings || {},
      },
    });
  }

  async updateSection(
    pageId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    const section = await this.prisma.pageSection.findFirst({
      where: { id: sectionId, pageId },
    });

    if (!section) {
      throw new NotFoundException("Page section not found");
    }

    return this.prisma.pageSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.settings ? { settings: dto.settings } : {}),
      },
    });
  }

  async reorderSections(pageId: string, dto: ReorderSectionsDto) {
    await this.prisma.$transaction(
      dto.sectionIds.map((id, index) =>
        this.prisma.pageSection.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.prisma.pageSection.findMany({
      where: { pageId },
      orderBy: { order: "asc" },
    });
  }

  async deleteSection(pageId: string, sectionId: string) {
    const section = await this.prisma.pageSection.findFirst({
      where: { id: sectionId, pageId },
    });

    if (!section) {
      throw new NotFoundException("Page section not found");
    }

    await this.prisma.pageSection.delete({
      where: { id: sectionId },
    });

    return { message: "Section removed successfully" };
  }
}
