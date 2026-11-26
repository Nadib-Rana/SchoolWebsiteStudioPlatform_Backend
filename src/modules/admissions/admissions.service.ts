import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
  Logger,
} from "@nestjs/common";
import { AdmissionStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { IntegrationsService } from "../integrations/integrations.service";
import { ErpClientService } from "../integrations/erp-client.service";
import { buildIdempotencyKey } from "../integrations/erp-crypto.util";
import {
  ApplyAdmissionDto,
  AdmissionQueryDto,
  UpdateAdmissionStatusDto,
  PayOnlineAdmissionDto,
  VerifyOnlinePaymentDto,
  PayManualAdmissionDto,
} from "./dto/admissions.dto";

const DEFAULT_LOCAL_CLASSES = [
  { id: "Kindergarten", name: "Kindergarten" },
  { id: "Grade 1", name: "Grade 1" },
  { id: "Grade 2", name: "Grade 2" },
  { id: "Grade 3", name: "Grade 3" },
  { id: "Grade 4", name: "Grade 4" },
  { id: "Grade 5", name: "Grade 5" },
  { id: "Grade 6", name: "Grade 6" },
  { id: "Grade 7", name: "Grade 7" },
  { id: "Grade 8", name: "Grade 8" },
  { id: "Grade 9", name: "Grade 9" },
  { id: "Grade 10", name: "Grade 10" },
  { id: "Grade 11", name: "Grade 11" },
  { id: "Grade 12", name: "Grade 12" },
];

const VALID_ADMISSION_STATUSES = new Set<string>(
  Object.values(AdmissionStatus),
);

@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly integrationsService: IntegrationsService,
    private readonly erpClient: ErpClientService,
  ) {}

  private async resolvePublishedSchool(schoolSlugOrId: string) {
    const slug = schoolSlugOrId.toLowerCase().trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug }, ...(isUuid ? [{ id: slug }] : [])],
        deletedAt: null,
      },
      include: { settings: true },
    });

    if (!school) {
      throw new NotFoundException(`School '${schoolSlugOrId}' not found`);
    }

    if (!school.isPublished) {
      throw new ForbiddenException(
        "This school website is currently unpublished or in maintenance mode.",
      );
    }

    return school;
  }

  private normalizeGenderForErp(gender: string): "MALE" | "FEMALE" | "OTHER" {
    const upper = (gender || "").trim().toUpperCase();
    if (upper === "MALE" || upper === "M") return "MALE";
    if (upper === "FEMALE" || upper === "F") return "FEMALE";
    return "OTHER";
  }

  private normalizeRelationshipForErp(rel: string): string {
    const upper = (rel || "").trim().toUpperCase();
    if (upper.includes("FATHER")) return "FATHER";
    if (upper.includes("MOTHER")) return "MOTHER";
    if (upper.includes("GUARDIAN")) return "GUARDIAN";
    return upper.replace(/\s+/g, "_") || "GUARDIAN";
  }

  private splitStudentName(dto: ApplyAdmissionDto): {
    firstName: string;
    lastName: string;
    fullName: string;
  } {
    if (dto.firstName?.trim() && dto.lastName?.trim()) {
      const firstName = dto.firstName.trim();
      const lastName = dto.lastName.trim();
      return { firstName, lastName, fullName: `${firstName} ${lastName}` };
    }

    const full = (dto.studentName || dto.firstName || "").trim();
    if (!full) {
      throw new BadRequestException("Student name is required.");
    }
    const parts = full.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "-";
    return { firstName, lastName, fullName: full };
  }

  private validatePhotoUrl(raw?: string): string | undefined {
    const trimmed = raw?.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("https://")) {
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        throw new BadRequestException(
          "Applicant photo must be a valid HTTPS image URL or a WebP/JPEG/PNG Data URI (<= 1.5 MB).",
        );
      }
    }

    const match = trimmed.match(
      /^data:image\/(webp|jpeg|jpg|png);base64,([A-Za-z0-9+/=\s]+)$/i,
    );
    if (match) {
      const mimeType = match[1].toLowerCase();
      const base64Clean = match[2].replace(/\s+/g, "");
      const decodedBytes = Buffer.from(base64Clean, "base64").length;
      if (decodedBytes > 1.5 * 1024 * 1024) {
        throw new BadRequestException(
          "Applicant photo must be 1.5 MB or smaller.",
        );
      }
      return `data:image/${mimeType};base64,${base64Clean}`;
    }

    throw new BadRequestException(
      "Applicant photo must be a valid HTTPS image URL or a WebP/JPEG/PNG Data URI (<= 1.5 MB).",
    );
  }

  private normalizeStatus(status?: string): AdmissionStatus {
    const upper = (status || "PENDING").trim().toUpperCase();
    if (VALID_ADMISSION_STATUSES.has(upper)) {
      return upper as AdmissionStatus;
    }
    return AdmissionStatus.PENDING;
  }

  private async generateUniqueApplicationNumber(
    year: number = new Date().getFullYear(),
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const num = Math.floor(100000 + Math.random() * 900000);
      const candidate = `ADM-${year}-${num}`;
      if (this.prisma?.admissionApplication?.findUnique) {
        try {
          const existing = await this.prisma.admissionApplication.findUnique({
            where: { applicationNumber: candidate },
            select: { id: true },
          });
          if (!existing) {
            return candidate;
          }
        } catch {
          return candidate;
        }
      } else {
        return candidate;
      }
    }
    return `ADM-${year}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async getPublicClasses(schoolSlug: string) {
    const school = await this.resolvePublishedSchool(schoolSlug);
    const erpConfig = await this.integrationsService.getActiveErpConfig(
      school.id,
    );

    if (erpConfig) {
      try {
        const classes = await this.erpClient.getPublicClasses(
          erpConfig.baseUrl,
          erpConfig.apiKey,
          school.id,
        );
        return {
          source: "ERP" as const,
          erpConnected: true,
          classes,
        };
      } catch (err: any) {
        this.logger.warn(
          `Failed to load ERP classes for school ${school.slug}, falling back to default grades: ${err?.message}`,
        );
      }
    }

    return {
      source: "LOCAL" as const,
      erpConnected: false,
      classes: DEFAULT_LOCAL_CLASSES,
    };
  }

  async getPublicFeeConfig(schoolSlug: string) {
    const school = await this.resolvePublishedSchool(schoolSlug);
    const erpConfig = await this.integrationsService.getActiveErpConfig(
      school.id,
    );

    if (erpConfig) {
      try {
        const config = await this.erpClient.getPublicFeeConfig(
          erpConfig.baseUrl,
          erpConfig.apiKey,
          school.id,
        );
        return {
          source: "ERP" as const,
          erpConnected: true,
          ...config,
        };
      } catch (err: any) {
        this.logger.warn(
          `Failed to load ERP fee config for school ${school.slug}: ${err?.message}`,
        );
      }
    }

    return {
      source: "LOCAL" as const,
      erpConnected: false,
      enabled: false,
      currency: "BDT",
      defaultFee: 0,
      classFees: {},
      allowOnlinePayment: false,
      allowManualPayment: false,
      manualInstructions: "",
      activeGateways: [] as string[],
    };
  }

  private async requireActiveErpAdmissionSchool(schoolSlug: string) {
    const school = await this.resolvePublishedSchool(schoolSlug);
    if (school.settings?.maintenanceMode) {
      throw new ForbiddenException(
        "This school website is currently undergoing scheduled maintenance. Please try again later.",
      );
    }
    if (school.settings && school.settings.allowPublicAdmission === false) {
      throw new ForbiddenException(
        "Public admissions are currently closed for this school.",
      );
    }
    const erpConfig = await this.integrationsService.getActiveErpConfig(
      school.id,
    );
    if (!erpConfig) {
      throw new ForbiddenException(
        "Online admission fee payment requires an active School ERP connection.",
      );
    }
    return { school, erpConfig };
  }

  private async resolveErpLookupNumber(
    schoolId: string,
    applicationNumber: string,
  ): Promise<string> {
    const normalized = applicationNumber.trim().toUpperCase();
    if (!this.prisma?.admissionApplication?.findFirst) {
      return normalized;
    }
    const localMatch = await this.prisma.admissionApplication.findFirst({
      where: {
        schoolId,
        OR: [
          { applicationNumber: normalized },
          { erpApplicationNumber: normalized },
        ],
      },
      select: { erpApplicationNumber: true },
    });
    return localMatch?.erpApplicationNumber || normalized;
  }

  async initiateOnlinePayment(schoolSlug: string, dto: PayOnlineAdmissionDto) {
    const { school, erpConfig } =
      await this.requireActiveErpAdmissionSchool(schoolSlug);
    const lookupNumber = await this.resolveErpLookupNumber(
      school.id,
      dto.applicationNumber,
    );
    return this.erpClient.initiateOnlinePayment(
      erpConfig.baseUrl,
      erpConfig.apiKey,
      {
        applicationNumber: lookupNumber,
        identifier: dto.identifier.trim(),
        gateway: dto.gateway.trim().toUpperCase(),
        callbackBaseUrl: dto.callbackBaseUrl.trim(),
      },
    );
  }

  async verifyOnlinePayment(
    schoolSlug: string,
    dto: VerifyOnlinePaymentDto,
  ) {
    const { school, erpConfig } =
      await this.requireActiveErpAdmissionSchool(schoolSlug);
    const lookupNumber = await this.resolveErpLookupNumber(
      school.id,
      dto.applicationNumber,
    );
    return this.erpClient.verifyOnlinePayment(
      erpConfig.baseUrl,
      erpConfig.apiKey,
      {
        applicationNumber: lookupNumber,
        identifier: dto.identifier.trim(),
        gateway: dto.gateway.trim().toUpperCase(),
        ...(dto.transactionId?.trim()
          ? { transactionId: dto.transactionId.trim() }
          : {}),
        ...(dto.valId?.trim() ? { valId: dto.valId.trim() } : {}),
        ...(dto.paymentID?.trim()
          ? { paymentID: dto.paymentID.trim() }
          : {}),
      },
    );
  }

  async submitManualPayment(schoolSlug: string, dto: PayManualAdmissionDto) {
    const { school, erpConfig } =
      await this.requireActiveErpAdmissionSchool(schoolSlug);
    const lookupNumber = await this.resolveErpLookupNumber(
      school.id,
      dto.applicationNumber,
    );
    return this.erpClient.submitManualPayment(
      erpConfig.baseUrl,
      erpConfig.apiKey,
      {
        applicationNumber: lookupNumber,
        identifier: dto.identifier.trim(),
        paymentMethod: dto.paymentMethod.trim().toUpperCase(),
        transactionId: dto.transactionId.trim(),
        ...(dto.paymentNote?.trim()
          ? { paymentNote: dto.paymentNote.trim() }
          : {}),
      },
    );
  }

  async apply(dto: ApplyAdmissionDto) {
    const school = await this.resolvePublishedSchool(dto.schoolSlug);

    if (school.settings?.maintenanceMode) {
      throw new ForbiddenException(
        "This school website is currently undergoing scheduled maintenance. Please try again later.",
      );
    }

    if (school.settings && school.settings.allowPublicAdmission === false) {
      throw new ForbiddenException(
        "Public admissions are currently closed for this school.",
      );
    }

    const { firstName, lastName, fullName } = this.splitStudentName(dto);
    const dobFormatted = dto.dateOfBirth.slice(0, 10);
    const applicantPhone = (dto.phone || dto.guardianPhone).trim();
    const guardianEmail = (dto.guardianEmail || dto.email || "")
      .toLowerCase()
      .trim();
    const presentAddress =
      dto.presentAddress?.trim() || dto.address?.trim() || "";
    if (!presentAddress) {
      throw new BadRequestException("Present residential address is required.");
    }
    const permanentAddress = dto.permanentAddress?.trim() || "";
    const validPhotoUrl = this.validatePhotoUrl(dto.photoUrl);
    const mergedDocuments: Record<string, any> | undefined =
      dto.documents ||
      dto.documentsUrl ||
      validPhotoUrl ||
      dto.birthRegistrationNo?.trim() ||
      dto.fatherName?.trim() ||
      dto.motherName?.trim() ||
      dto.presentAddress?.trim() ||
      permanentAddress
        ? {
            ...(dto.documents || {}),
            ...(dto.documentsUrl?.trim()
              ? { documentsUrl: dto.documentsUrl.trim() }
              : {}),
            ...(validPhotoUrl ? { photoUrl: validPhotoUrl } : {}),
            ...(dto.birthRegistrationNo?.trim()
              ? { birthRegistrationNo: dto.birthRegistrationNo.trim() }
              : {}),
            ...(dto.fatherName?.trim()
              ? { fatherName: dto.fatherName.trim() }
              : {}),
            ...(dto.motherName?.trim()
              ? { motherName: dto.motherName.trim() }
              : {}),
            ...(dto.presentAddress?.trim()
              ? { presentAddress: dto.presentAddress.trim() }
              : {}),
            ...(permanentAddress ? { permanentAddress } : {}),
          }
        : undefined;

    const erpConfig = await this.integrationsService.getActiveErpConfig(
      school.id,
    );

    if (erpConfig) {
      const isUuidClass = Boolean(
        dto.appliedClassId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            dto.appliedClassId,
          ),
      );

      const idempotencyKey = buildIdempotencyKey([
        school.id,
        firstName,
        lastName,
        applicantPhone,
        dto.appliedClassId || dto.applyingForGrade,
        String(Math.floor(Date.now() / (2 * 60 * 1000))),
      ]);

      try {
        const erpResult = await this.erpClient.submitAdmission(
          erpConfig.baseUrl,
          erpConfig.apiKey,
          {
            firstName,
            lastName,
            dob: dobFormatted,
            gender: this.normalizeGenderForErp(dto.gender),
            phone: applicantPhone,
            guardianName: dto.guardianName.trim(),
            guardianPhone: dto.guardianPhone.trim(),
            ...(isUuidClass ? { appliedClassId: dto.appliedClassId } : {}),
            ...(dto.email?.trim() ? { email: dto.email.trim().toLowerCase() } : {}),
            ...(guardianEmail ? { guardianEmail } : {}),
            relationship: this.normalizeRelationshipForErp(
              dto.guardianRelationship,
            ),
            ...(dto.bloodGroup?.trim()
              ? { bloodGroup: dto.bloodGroup.trim() }
              : {}),
            ...(dto.birthRegistrationNo?.trim()
              ? { birthRegistrationNo: dto.birthRegistrationNo.trim() }
              : {}),
            ...(dto.fatherName?.trim()
              ? { fatherName: dto.fatherName.trim() }
              : {}),
            ...(dto.motherName?.trim()
              ? { motherName: dto.motherName.trim() }
              : {}),
            ...(dto.previousSchool?.trim()
              ? { previousSchool: dto.previousSchool.trim() }
              : {}),
            address: presentAddress,
            presentAddress,
            ...(permanentAddress ? { permanentAddress } : {}),
            ...(validPhotoUrl ? { photoUrl: validPhotoUrl } : {}),
            ...(dto.documentsUrl?.trim()
              ? { documentsUrl: dto.documentsUrl.trim() }
              : {}),
          },
          idempotencyKey,
        );

        const applicationNumber =
          erpResult.applicationNumber ||
          (await this.generateUniqueApplicationNumber());
        const erpStatus = erpResult.status || "PENDING";
        const feeAmount = Number(erpResult.feeAmount ?? 0);
        const paymentStatus =
          erpResult.paymentStatus ||
          (feeAmount > 0 ? "PENDING" : "NOT_REQUIRED");
        const currency = erpResult.currency || "BDT";

        // Mirror in local DB so Studio dashboard remains in sync
        try {
          await this.prisma.admissionApplication.upsert({
            where: { applicationNumber },
            update: {
              status: this.normalizeStatus(erpStatus),
              externalSource: "ERP",
              externalApplicationId: erpResult.id || null,
              erpApplicationNumber: applicationNumber,
              ...(mergedDocuments ? { documents: mergedDocuments as any } : {}),
            },
            create: {
              schoolId: school.id,
              applicationNumber,
              erpApplicationNumber: applicationNumber,
              studentName: fullName,
              dateOfBirth: new Date(dobFormatted),
              gender: this.normalizeGenderForErp(dto.gender),
              applyingForGrade: dto.applyingForGrade,
              appliedClassId: dto.appliedClassId || null,
              studentPhone: applicantPhone,
              studentEmail: dto.email?.trim().toLowerCase() || null,
              bloodGroup: dto.bloodGroup?.trim() || null,
              previousSchool: dto.previousSchool?.trim() || null,
              guardianName: dto.guardianName.trim(),
              guardianRelationship: dto.guardianRelationship,
              guardianPhone: dto.guardianPhone.trim(),
              guardianEmail: guardianEmail || "not-provided@school.local",
              address: presentAddress,
              documents: mergedDocuments as any,
              status: this.normalizeStatus(erpStatus),
              externalSource: "ERP",
              externalApplicationId: erpResult.id || null,
            },
          });
        } catch (mirrorErr: any) {
          this.logger.warn(
            `ERP application ${applicationNumber} created, but local mirror failed: ${mirrorErr?.message}`,
          );
        }

        return {
          success: true,
          source: "ERP" as const,
          applicationNumber,
          studentName: fullName,
          status: erpStatus,
          feeAmount,
          paymentStatus,
          currency,
          photoUrl: validPhotoUrl || null,
          message:
            "Your admission application has been submitted to the school ERP. Keep your application number safe to track your status.",
        };
      } catch (err: any) {
        // Only fall back to offline queue when ERP server is unreachable/down (502/timeout/5xx).
        // Validation (400), disabled (403), and rate-limit (429) errors must still be surfaced.
        if (!(err instanceof BadGatewayException)) {
          throw err;
        }

        this.logger.warn(
          `ERP unreachable during admission submit for school ${school.slug}. Queueing locally as ERP_PENDING_SYNC: ${err.message}`,
        );

        const year = new Date().getFullYear();
        const queuedAppNumber = await this.generateUniqueApplicationNumber(year);

        const queued = await this.prisma.admissionApplication.create({
          data: {
            schoolId: school.id,
            applicationNumber: queuedAppNumber,
            studentName: fullName,
            dateOfBirth: new Date(dobFormatted),
            gender: this.normalizeGenderForErp(dto.gender),
            applyingForGrade: dto.applyingForGrade,
            appliedClassId: dto.appliedClassId || null,
            studentPhone: applicantPhone,
            studentEmail: dto.email?.trim().toLowerCase() || null,
            bloodGroup: dto.bloodGroup?.trim() || null,
            previousSchool: dto.previousSchool?.trim() || null,
            guardianName: dto.guardianName.trim(),
            guardianRelationship: dto.guardianRelationship,
            guardianPhone: dto.guardianPhone.trim(),
            guardianEmail: guardianEmail || "not-provided@school.local",
            address: presentAddress,
            documents: mergedDocuments as any,
            status: AdmissionStatus.PENDING,
            notes: "Queued for automatic ERP synchronization.",
            externalSource: "ERP_PENDING_SYNC",
          },
        });

        return {
          success: true,
          source: "ERP_PENDING_SYNC" as const,
          queued: true,
          applicationNumber: queued.applicationNumber,
          studentName: queued.studentName,
          status: queued.status,
          feeAmount: 0,
          paymentStatus: "NOT_REQUIRED",
          currency: "BDT",
          photoUrl: validPhotoUrl || null,
          message:
            "Your admission application has been received and safely queued for ERP processing. Please keep your reference number to track status.",
        };
      }
    }

    // Standalone local mode (when ERP is not configured)
    const year = new Date().getFullYear();
    const applicationNumber = await this.generateUniqueApplicationNumber(year);

    const application = await this.prisma.admissionApplication.create({
      data: {
        schoolId: school.id,
        applicationNumber,
        studentName: fullName,
        dateOfBirth: new Date(dobFormatted),
        gender: dto.gender,
        applyingForGrade: dto.applyingForGrade,
        appliedClassId: dto.appliedClassId || null,
        studentPhone: applicantPhone,
        studentEmail: dto.email?.trim().toLowerCase() || null,
        bloodGroup: dto.bloodGroup?.trim() || null,
        previousSchool: dto.previousSchool || null,
        guardianName: dto.guardianName.trim(),
        guardianRelationship: dto.guardianRelationship,
        guardianPhone: dto.guardianPhone.trim(),
        guardianEmail: guardianEmail || "not-provided@school.local",
        address: presentAddress,
        documents: mergedDocuments as any,
        status: AdmissionStatus.SUBMITTED,
        externalSource: "LOCAL",
      },
    });

    return {
      success: true,
      source: "LOCAL" as const,
      applicationNumber: application.applicationNumber,
      studentName: application.studentName,
      status: application.status,
      feeAmount: 0,
      paymentStatus: "NOT_REQUIRED",
      currency: "BDT",
      photoUrl: validPhotoUrl || null,
      message:
        "Your admission application has been registered successfully. Please keep your application number safe for status tracking.",
    };
  }

  async track(
    applicationNumber: string,
    identifierOrPhone?: string,
    schoolSlug?: string,
  ) {
    const normalizedAppNum = applicationNumber.trim().toUpperCase();
    const identifier = (identifierOrPhone || "").trim();

    if (!identifier || identifier.length < 4) {
      throw new BadRequestException(
        "Applicant or guardian phone/email identifier is required for tracking verification.",
      );
    }

    // 1. If schoolSlug is provided, check if that school uses live ERP
    if (schoolSlug?.trim()) {
      const school = await this.resolvePublishedSchool(schoolSlug);
      const erpConfig = await this.integrationsService.getActiveErpConfig(
        school.id,
      );

      // Check local record first (bridges offline local ref -> synced ERP ref)
      const localMatch = await this.prisma.admissionApplication.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { applicationNumber: normalizedAppNum },
            { erpApplicationNumber: normalizedAppNum },
          ],
        },
      });

      // If still queued offline waiting for ERP sync, serve directly from local DB
      if (erpConfig && localMatch?.externalSource !== "ERP_PENDING_SYNC") {
        const erpLookupNumber =
          localMatch?.erpApplicationNumber || normalizedAppNum;

        try {
          const erpTrack = await this.erpClient.trackAdmission(
            erpConfig.baseUrl,
            erpConfig.apiKey,
            erpLookupNumber,
            identifier,
          );

          const resolvedStudentName =
            erpTrack.studentName ||
            [erpTrack.firstName, erpTrack.lastName].filter(Boolean).join(" ") ||
            "Applicant";
          const resolvedGrade =
            erpTrack.appliedClassName ||
            (typeof erpTrack.appliedClass === "string"
              ? erpTrack.appliedClass
              : erpTrack.appliedClass?.name) ||
            "Applied Class";
          const resolvedNotes =
            erpTrack.notes ||
            erpTrack.adminNotes ||
            erpTrack.remarks ||
            undefined;

          if (localMatch) {
            await this.prisma.admissionApplication
              .update({
                where: { id: localMatch.id },
                data: {
                  status: this.normalizeStatus(erpTrack.status),
                  notes: resolvedNotes ?? localMatch.notes,
                  interviewDate: erpTrack.interviewDate
                    ? new Date(erpTrack.interviewDate)
                    : localMatch.interviewDate,
                },
              })
              .catch(() => {});
          }

          return {
            source: "ERP" as const,
            applicationNumber: erpTrack.applicationNumber || erpLookupNumber,
            schoolName: erpConfig.schoolName || school.name,
            studentName: resolvedStudentName,
            applyingForGrade:
              resolvedGrade !== "Applied Class"
                ? resolvedGrade
                : localMatch?.applyingForGrade || resolvedGrade,
            status: erpTrack.status || "PENDING",
            interviewDate: erpTrack.interviewDate || null,
            notes: resolvedNotes,
            feeAmount: erpTrack.feeAmount,
            paymentStatus: erpTrack.paymentStatus,
            paymentMethod: erpTrack.paymentMethod ?? null,
            transactionId: erpTrack.transactionId ?? null,
            paymentNote: erpTrack.paymentNote ?? null,
            paidAt: erpTrack.paidAt ?? null,
            currency: erpTrack.currency || "BDT",
            photoUrl:
              erpTrack.photoUrl ||
              (localMatch?.documents as Record<string, any> | null)?.photoUrl ||
              null,
            submittedAt:
              erpTrack.createdAt ||
              localMatch?.createdAt?.toISOString() ||
              new Date().toISOString(),
            lastUpdatedAt:
              erpTrack.updatedAt ||
              localMatch?.updatedAt?.toISOString() ||
              new Date().toISOString(),
          };
        } catch (err: any) {
          // If ERP is temporarily unreachable, fall through to local mirror lookup
          if (!(err instanceof BadGatewayException)) {
            throw err;
          }
          this.logger.warn(
            `ERP unreachable during tracking for ${normalizedAppNum}; falling back to local mirror.`,
          );
        }
      }
    }

    // 2. Fallback to local DB lookup (matches either local or ERP applicationNumber)
    const cleanDigits = identifier.replace(/[^0-9]/g, "");
    const tail = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : identifier;

    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        AND: [
          {
            OR: [
              { applicationNumber: normalizedAppNum },
              { erpApplicationNumber: normalizedAppNum },
            ],
          },
          {
            OR: [
              { guardianPhone: { contains: tail } },
              { studentPhone: { contains: tail } },
              {
                guardianEmail: {
                  equals: identifier.toLowerCase(),
                  mode: "insensitive",
                },
              },
              {
                studentEmail: {
                  equals: identifier.toLowerCase(),
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
      include: {
        school: {
          select: {
            id: true,
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

    const docs = application.documents as Record<string, any> | null;
    return {
      source: application.externalSource === "ERP" ? ("ERP" as const) : ("LOCAL" as const),
      applicationNumber: application.applicationNumber,
      schoolName: application.school.name,
      studentName: application.studentName,
      applyingForGrade: application.applyingForGrade,
      status: application.status,
      interviewDate: application.interviewDate?.toISOString() || null,
      notes: application.notes,
      photoUrl: docs?.photoUrl || null,
      submittedAt: application.createdAt,
      lastUpdatedAt: application.updatedAt,
    };
  }

  async verifyAlumni(schoolSlug: string, code: string) {
    if (!code?.trim()) {
      throw new BadRequestException(
        "Admission / Alumni code is required for verification.",
      );
    }

    const school = await this.resolvePublishedSchool(schoolSlug);
    const erpConfig = await this.integrationsService.getActiveErpConfig(
      school.id,
    );

    if (!erpConfig) {
      throw new ForbiddenException(
        "Alumni verification requires an active School ERP connection.",
      );
    }

    const result = await this.erpClient.verifyAlumni(
      erpConfig.baseUrl,
      erpConfig.apiKey,
      erpConfig.tenantId,
      code.trim(),
    );

    return {
      schoolName: erpConfig.schoolName || school.name,
      code: code.trim(),
      ...result,
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

    const updated = await this.prisma.admissionApplication.update({
      where: { id: appId },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    if (
      application.guardianEmail &&
      application.guardianEmail !== "not-provided@school.local"
    ) {
      this.mailService
        .sendMail({
          to: application.guardianEmail,
          subject: `Admission Application ${application.applicationNumber} - Status Updated`,
          template: "notification",
          context: {
            title: `Application Status: ${dto.status.replace(/_/g, " ")}`,
            message: `Dear ${application.guardianName},\n\nThe admission application for ${application.studentName} (${application.applicationNumber}) has been updated to: ${dto.status.replace(/_/g, " ")}.\n\n${dto.notes || "Please check your application portal for further instructions."}`,
          },
        })
        .catch(() => {});
    }

    return updated;
  }
}
