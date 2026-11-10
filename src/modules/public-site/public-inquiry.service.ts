import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import {
  ContactInquiryDto,
  UpdateInquiryStatusDto,
} from "./dto/public-site.dto";

@Injectable()
export class PublicInquiryService {
  private readonly logger = new Logger(PublicInquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createInquiry(dto: ContactInquiryDto) {
    const trimmed = dto.schoolSlug.toLowerCase().trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug: trimmed }, ...(isUuid ? [{ id: trimmed }] : [])],
      },
      select: { id: true, name: true, slug: true },
    });

    if (!school) {
      throw new NotFoundException(`School '${dto.schoolSlug}' not found`);
    }

    const inquiry = await this.prisma.contactInquiry.create({
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

    // Send automated acknowledgment email
    void this.mailService
      .sendNotification(
        dto.email,
        dto.fullName,
        `Thank you for contacting ${school.name}`,
        `We have received your message regarding "${dto.subject}". Our team will review your inquiry and get back to you shortly.`,
      )
      .catch((err) =>
        this.logger.warn(`Failed to send acknowledgment email: ${err.message}`),
      );

    return inquiry;
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

    const updated = await this.prisma.contactInquiry.update({
      where: { id: inquiryId },
      data: {
        status: dto.status,
        ...(dto.responseNotes !== undefined
          ? { responseNotes: dto.responseNotes }
          : {}),
      },
    });

    if (dto.sendEmailReply && dto.replyMessage && inquiry.email) {
      void this.mailService
        .sendNotification(
          inquiry.email,
          inquiry.fullName,
          `Re: ${inquiry.subject}`,
          dto.replyMessage,
        )
        .catch((err) =>
          this.logger.warn(`Failed to send inquiry reply email: ${err.message}`),
        );
    }

    return updated;
  }

  async deleteInquiry(schoolId: string, inquiryId: string) {
    const inquiry = await this.prisma.contactInquiry.findFirst({
      where: { id: inquiryId, schoolId },
    });

    if (!inquiry) {
      throw new NotFoundException("Contact inquiry not found");
    }

    await this.prisma.contactInquiry.delete({
      where: { id: inquiryId },
    });

    return { message: "Contact inquiry deleted successfully" };
  }
}
