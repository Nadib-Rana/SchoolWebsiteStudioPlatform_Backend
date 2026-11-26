import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateGoverningMemberDto,
  GoverningMemberQueryDto,
  UpdateGoverningMemberDto,
} from "./dto/governing-body.dto";

@Injectable()
export class GoverningBodyService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizePayload(
    dto: CreateGoverningMemberDto | UpdateGoverningMemberDto,
  ) {
    const clean = (val?: string) =>
      val === undefined ? undefined : val.trim() || null;

    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.designation !== undefined
        ? { designation: dto.designation.trim() }
        : {}),
      ...(dto.category !== undefined
        ? { category: dto.category.trim() || "GOVERNING_BODY" }
        : {}),
      ...(dto.qualification !== undefined
        ? { qualification: clean(dto.qualification) }
        : {}),
      ...(dto.termPeriod !== undefined
        ? { termPeriod: clean(dto.termPeriod) }
        : {}),
      ...(dto.email !== undefined ? { email: clean(dto.email) } : {}),
      ...(dto.phone !== undefined ? { phone: clean(dto.phone) } : {}),
      ...(dto.photoUrl !== undefined ? { photoUrl: clean(dto.photoUrl) } : {}),
      ...(dto.message !== undefined ? { message: clean(dto.message) } : {}),
      ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      ...(dto.order !== undefined ? { order: dto.order } : {}),
      ...(dto.status !== undefined
        ? { status: dto.status.trim() || "ACTIVE" }
        : {}),
    };
  }

  async getMembers(schoolId: string, query: GoverningMemberQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.category?.trim()) {
      where.category = { equals: query.category.trim(), mode: "insensitive" };
    }

    if (query.status?.trim()) {
      where.status = query.status.trim();
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { designation: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { termPeriod: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.governingMember.count({ where }),
      this.prisma.governingMember.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
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

  async getMemberById(schoolId: string, memberId: string) {
    const member = await this.prisma.governingMember.findFirst({
      where: { id: memberId, schoolId },
    });

    if (!member) {
      throw new NotFoundException("Governing body member not found");
    }

    return member;
  }

  async createMember(schoolId: string, dto: CreateGoverningMemberDto) {
    return this.prisma.governingMember.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        designation: dto.designation.trim(),
        category: dto.category?.trim() || "GOVERNING_BODY",
        ...this.sanitizePayload(dto),
      },
    });
  }

  async updateMember(
    schoolId: string,
    memberId: string,
    dto: UpdateGoverningMemberDto,
  ) {
    await this.getMemberById(schoolId, memberId);

    return this.prisma.governingMember.update({
      where: { id: memberId },
      data: this.sanitizePayload(dto),
    });
  }

  async deleteMember(schoolId: string, memberId: string) {
    await this.getMemberById(schoolId, memberId);

    await this.prisma.governingMember.delete({
      where: { id: memberId },
    });

    return { message: "Governing body member deleted successfully" };
  }
}

