import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  ContactInquiryDto,
  UpdateInquiryStatusDto,
} from "./dto/public-site.dto";

@Injectable()
export class PublicInquiryService {
  constructor(private readonly prisma: PrismaService) {}

  async createInquiry(dto: ContactInquiryDto) {
    const trimmed = dto.schoolSlug.toLowerCase().trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug: trimmed }, ...(isUuid ? [{ id: trimmed }] : [])],
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
