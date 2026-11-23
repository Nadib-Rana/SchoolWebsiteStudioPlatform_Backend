import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { AdmissionsService } from "./admissions.service";

describe("AdmissionsService — Zero-Downtime ERP Offline Fallback", () => {
  const mockSchool = {
    id: "school-uuid-1",
    slug: "greenfield",
    name: "Greenfield Academy",
    isPublished: true,
    settings: { allowPublicAdmission: true },
  };

  const mockErpConfig = {
    baseUrl: "https://erp.school.edu.bd/api/v1",
    apiKey: "sk_web_secret_123",
    tenantId: "tenant-1",
    schoolName: "Greenfield Academy",
    enabled: true,
  };

  let prisma: any;
  let mailService: any;
  let integrationsService: any;
  let erpClient: any;
  let service: AdmissionsService;

  beforeEach(() => {
    prisma = {
      school: { findFirst: jest.fn().mockResolvedValue(mockSchool) },
      admissionApplication: {
        create: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    integrationsService = {
      getActiveErpConfig: jest.fn().mockResolvedValue(mockErpConfig),
    };
    erpClient = {
      submitAdmission: jest.fn(),
      trackAdmission: jest.fn(),
      getPublicClasses: jest.fn(),
      verifyAlumni: jest.fn(),
    };
    service = new AdmissionsService(
      prisma,
      mailService,
      integrationsService,
      erpClient,
    );
  });

  it("queues admission locally as ERP_PENDING_SYNC when ERP is unreachable (502/network)", async () => {
    erpClient.submitAdmission.mockRejectedValue(
      new BadGatewayException("ERP unreachable"),
    );
    prisma.admissionApplication.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...data, id: "local-1" }),
    );

    const res = await service.apply({
      schoolSlug: "greenfield",
      firstName: "Arafat",
      lastName: "Rahman",
      dateOfBirth: "2012-05-15",
      gender: "MALE",
      phone: "01711000000",
      applyingForGrade: "Class 6",
      guardianName: "Kamal Rahman",
      guardianRelationship: "Father",
      guardianPhone: "01711000001",
      guardianEmail: "kamal@example.com",
      address: "Dhaka",
    });

    expect(res.success).toBe(true);
    expect(res.source).toBe("ERP_PENDING_SYNC");
    expect((res as any).queued).toBe(true);
    expect(prisma.admissionApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalSource: "ERP_PENDING_SYNC",
          status: "PENDING",
        }),
      }),
    );
  });

  it("does NOT queue locally on 400 validation errors from ERP", async () => {
    erpClient.submitAdmission.mockRejectedValue(
      new BadRequestException(["dob must be a valid ISO date"]),
    );

    await expect(
      service.apply({
        schoolSlug: "greenfield",
        firstName: "Arafat",
        lastName: "Rahman",
        dateOfBirth: "invalid-date",
        gender: "MALE",
        phone: "01711000000",
        applyingForGrade: "Class 6",
        guardianName: "Kamal Rahman",
        guardianRelationship: "Father",
        guardianPhone: "01711000001",
        address: "Dhaka",
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.admissionApplication.create).not.toHaveBeenCalled();
  });

  it("bridges original local offline reference number to synced ERP number during tracking", async () => {
    prisma.admissionApplication.findFirst.mockResolvedValue({
      id: "local-1",
      applicationNumber: "ADM-2026-8421",
      erpApplicationNumber: "ADM-2026-0042",
      externalSource: "ERP",
      applyingForGrade: "Class 6",
      createdAt: new Date("2026-11-20T00:00:00Z"),
      updatedAt: new Date("2026-11-20T00:00:00Z"),
    });
    erpClient.trackAdmission.mockResolvedValue({
      applicationNumber: "ADM-2026-0042",
      studentName: "Arafat Rahman",
      appliedClassName: "Class 6",
      status: "APPROVED",
      notes: "Welcome!",
    });

    const result = await service.track(
      "ADM-2026-8421",
      "01711000000",
      "greenfield",
    );

    expect(erpClient.trackAdmission).toHaveBeenCalledWith(
      mockErpConfig.baseUrl,
      mockErpConfig.apiKey,
      "ADM-2026-0042",
      "01711000000",
    );
    expect(result.status).toBe("APPROVED");
  });

  it("falls back to local mirror when ERP is unreachable during tracking", async () => {
    const mirrorRecord = {
      id: "local-1",
      applicationNumber: "ADM-2026-0042",
      erpApplicationNumber: "ADM-2026-0042",
      studentName: "Arafat Rahman",
      applyingForGrade: "Class 6",
      status: "UNDER_REVIEW",
      notes: "Interview soon",
      externalSource: "ERP",
      createdAt: new Date("2026-11-20T00:00:00Z"),
      updatedAt: new Date("2026-11-20T01:00:00Z"),
      school: { id: "school-uuid-1", name: "Greenfield Academy", slug: "greenfield" },
    };

    prisma.admissionApplication.findFirst
      .mockResolvedValueOnce(mirrorRecord) // initial localMatch check
      .mockResolvedValueOnce(mirrorRecord); // fallback lookup
    erpClient.trackAdmission.mockRejectedValue(
      new BadGatewayException("ERP offline"),
    );

    const result = await service.track(
      "ADM-2026-0042",
      "01711000000",
      "greenfield",
    );

    expect(result.status).toBe("UNDER_REVIEW");
    expect(result.studentName).toBe("Arafat Rahman");
  });

  it("verifies alumni using x-website-key even when tenantId is omitted", async () => {
    integrationsService.getActiveErpConfig.mockResolvedValue({
      baseUrl: "https://apiedu.selusbd.com/api/v1",
      apiKey: "sk_web_key_only",
      enabled: true,
    });
    erpClient.verifyAlumni.mockResolvedValue({
      verified: true,
      name: "Nadia Islam",
      graduationYear: 2022,
      batch: "2022",
      className: "Grade 10",
    });

    const result = await service.verifyAlumni("greenfield", "ADM-2022-001");

    expect(erpClient.verifyAlumni).toHaveBeenCalledWith(
      "https://apiedu.selusbd.com/api/v1",
      "sk_web_key_only",
      undefined,
      "ADM-2022-001",
    );
    expect(result.verified).toBe(true);
    expect((result as any).name).toBe("Nadia Islam");
  });

  it("forwards valid photoUrl to ERP and rejects invalid photoUrl formats", async () => {
    const sampleWebp = `data:image/webp;base64,${Buffer.from("fake-webp-bytes").toString("base64")}`;
    erpClient.submitAdmission.mockResolvedValue({
      id: "erp-app-1",
      applicationNumber: "ADM-2026-0099",
      status: "SUBMITTED",
    });

    const okRes = await service.apply({
      schoolSlug: "greenfield",
      firstName: "Arafat",
      lastName: "Rahman",
      dateOfBirth: "2012-05-15",
      gender: "MALE",
      phone: "01711000000",
      applyingForGrade: "Class 6",
      guardianName: "Kamal Rahman",
      guardianRelationship: "Father",
      guardianPhone: "01711000001",
      guardianEmail: "kamal@example.com",
      address: "Dhaka",
      photoUrl: sampleWebp,
    });

    expect(okRes.success).toBe(true);
    expect(erpClient.submitAdmission).toHaveBeenCalledWith(
      mockErpConfig.baseUrl,
      mockErpConfig.apiKey,
      expect.objectContaining({ photoUrl: sampleWebp }),
      expect.any(String),
    );

    await expect(
      service.apply({
        schoolSlug: "greenfield",
        firstName: "Arafat",
        lastName: "Rahman",
        dateOfBirth: "2012-05-15",
        gender: "MALE",
        phone: "01711000000",
        applyingForGrade: "Class 6",
        guardianName: "Kamal Rahman",
        guardianRelationship: "Father",
        guardianPhone: "01711000001",
        address: "Dhaka",
        photoUrl: "http://insecure.example.com/photo.jpg",
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

