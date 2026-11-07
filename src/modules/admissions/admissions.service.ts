import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  ApplyAdmissionDto,
  AdmissionQueryDto,
  UpdateAdmissionStatusDto,
} from "./dto/admissions.dto";

@Injectable()
export class AdmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(dto: ApplyAdmissionDto) {
    const slug = dto.schoolSlug.toLowerCase().trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug }, ...(isUuid ? [{ id: slug }] : [])],
        deletedAt: null,
      },
      include: {
        settings: true,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${dto.schoolSlug}' not found`);
    }

    if (!school.isPublished) {
      throw new ForbiddenException(
        "This school website is currently unpublished or in maintenance mode.",
      );
    }

    if (school.settings && school.settings.allowPublicAdmission === false) {
      throw new ForbiddenException(
        "Public admissions are currently closed for this school.",
      );
    }

    // Generate a unique application number: ADM-YEAR-RANDOM
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const applicationNumber = `ADM-${year}-${randomSuffix}`;

    const application = await this.prisma.admissionApplication.create({
      data: {
        schoolId: school.id,
        applicationNumber,
        studentName: dto.studentName.trim(),
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        applyingForGrade: dto.applyingForGrade,
        previousSchool: dto.previousSchool || null,
        guardianName: dto.guardianName.trim(),
        guardianRelationship: dto.guardianRelationship,
        guardianPhone: dto.guardianPhone.trim(),
        guardianEmail: dto.guardianEmail.toLowerCase().trim(),
        address: dto.address.trim(),
        documents: dto.documents ? (dto.documents as any) : undefined,
        status: "SUBMITTED",
      },
    });

    return {
      success: true,
      applicationNumber: application.applicationNumber,
      studentName: application.studentName,
      status: application.status,
      message:
        "Your admission application has been registered successfully. Please keep your application number safe for status tracking.",
    };
  }

  async track(applicationNumber: string, phone: string) {
    const normalizedAppNum = applicationNumber.trim().toUpperCase();

    if (!phone || phone.trim().length < 4) {
      throw new BadRequestException(
        "Guardian phone number is required to verify tracking identity.",
      );
    }

    const cleanDigits = phone.replace(/[^0-9]/g, "");

    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        applicationNumber: normalizedAppNum,
        guardianPhone: { contains: cleanDigits.slice(-4) },
      },
      include: {
        school: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        "Application record not found. Please verify the application number and phone number.",
      );
    }

    return {
      applicationNumber: application.applicationNumber,
      schoolName: application.school.name,
      studentName: application.studentName,
      applyingForGrade: application.applyingForGrade,
      status: application.status,
      notes: application.notes,
      submittedAt: application.createdAt,
      lastUpdatedAt: application.updatedAt,
    };
  }

  async findAll(schoolId: string, query: AdmissionQueryDto) {
    const where: any = { schoolId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.grade) {
      where.applyingForGrade = { contains: query.grade, mode: "insensitive" };
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { applicationNumber: { contains: q, mode: "insensitive" } },
        { studentName: { contains: q, mode: "insensitive" } },
        { guardianName: { contains: q, mode: "insensitive" } },
        { guardianPhone: { contains: q } },
        { guardianEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.prisma.admissionApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(schoolId: string, appId: string) {
    const application = await this.prisma.admissionApplication.findFirst({
      where: { id: appId, schoolId },
    });

    if (!application) {
      throw new NotFoundException("Admission application not found");
    }

    return application;
  }

  async updateStatus(
    schoolId: string,
    appId: string,
    dto: UpdateAdmissionStatusDto,
  ) {
    const application = await this.prisma.admissionApplication.findFirst({
      where: { id: appId, schoolId },
    });

    if (!application) {
      throw new NotFoundException("Admission application not found");
    }

    return this.prisma.admissionApplication.update({
      where: { id: appId },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }
}
