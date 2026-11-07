import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeQueryDto,
} from "./dto/notices.dto";

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotices(schoolId: string, query: NoticeQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.category) {
      where.category = { contains: query.category, mode: "insensitive" };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { category: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.notice.count({ where }),
      this.prisma.notice.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
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

  async getNoticeById(schoolId: string, noticeId: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, schoolId },
    });

    if (!notice) {
      throw new NotFoundException("Notice not found");
    }

    return notice;
  }

  async createNotice(schoolId: string, dto: CreateNoticeDto) {
    return this.prisma.notice.create({
      data: {
        schoolId,
        title: dto.title,
        category: dto.category || "General",
        description: dto.description,
        fileUrl: dto.fileUrl || null,
        isPinned: dto.isPinned || false,
        priority: dto.priority || "NORMAL",
        status: dto.status,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }

  async updateNotice(schoolId: string, noticeId: string, dto: UpdateNoticeDto) {
    await this.getNoticeById(schoolId, noticeId);

    return this.prisma.notice.update({
      where: { id: noticeId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.publishDate !== undefined
          ? { publishDate: new Date(dto.publishDate) }
          : {}),
        ...(dto.expiryDate !== undefined
          ? { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }
          : {}),
      },
    });
  }

  async deleteNotice(schoolId: string, noticeId: string) {
    await this.getNoticeById(schoolId, noticeId);

    await this.prisma.notice.delete({
      where: { id: noticeId },
    });

    return { message: "Notice deleted successfully" };
  }
}
