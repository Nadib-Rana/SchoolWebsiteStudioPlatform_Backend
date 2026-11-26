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
      getPublicFeeConfig: jest.fn(),
      initiateOnlinePayment: jest.fn(),
      verifyOnlinePayment: jest.fn(),
      submitManualPayment: jest.fn(),
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

  it("returns fee-config and extended apply fields with server-computed admission fee", async () => {
    erpClient.getPublicFeeConfig.mockResolvedValue({
      enabled: true,
      currency: "BDT",
      defaultFee: 500,
      classFees: { "cls-uuid-2": 500 },
      allowOnlinePayment: true,
      allowManualPayment: true,
      manualInstructions: "Send money to bKash 01711000000",
      activeGateways: ["BKASH", "SSLCOMMERZ"],
    });

    const feeCfg = await service.getPublicFeeConfig("greenfield");
    expect(feeCfg.erpConnected).toBe(true);
    expect(feeCfg.activeGateways).toEqual(["BKASH", "SSLCOMMERZ"]);

    erpClient.submitAdmission.mockResolvedValue({
      id: "erp-app-2",
      applicationNumber: "APP-20261127-4821",
      status: "SUBMITTED",
      feeAmount: 500,
      paymentStatus: "PENDING",
      currency: "BDT",
    });

    const applyRes = await service.apply({
      schoolSlug: "greenfield",
      firstName: "Arafat",
      lastName: "Rahman",
      dateOfBirth: "2012-05-15",
      gender: "MALE",
      phone: "01711000000",
      birthRegistrationNo: "20122691234567890",
      fatherName: "Kamal Rahman",
      motherName: "Fatema Begum",
      applyingForGrade: "Class 6",
      appliedClassId: "cls-uuid-2",
      guardianName: "Kamal Rahman",
      guardianRelationship: "PARENTS",
      guardianPhone: "01711000001",
      presentAddress: "House 12, Road 4, Mirpur, Dhaka",
      permanentAddress: "Village Rampur, Cumilla",
    });

    expect(erpClient.submitAdmission).toHaveBeenCalledWith(
      mockErpConfig.baseUrl,
      mockErpConfig.apiKey,
      expect.objectContaining({
        birthRegistrationNo: "20122691234567890",
        fatherName: "Kamal Rahman",
        motherName: "Fatema Begum",
        presentAddress: "House 12, Road 4, Mirpur, Dhaka",
        permanentAddress: "Village Rampur, Cumilla",
      }),
      expect.any(String),
    );
    expect(applyRes.feeAmount).toBe(500);
    expect(applyRes.paymentStatus).toBe("PENDING");
    expect(applyRes.currency).toBe("BDT");
  });

  it("proxies pay-online, verify-online-payment (with valId), pay-manual & payment tracking fields", async () => {
    erpClient.initiateOnlinePayment.mockResolvedValue({
      gateway: "SSLCOMMERZ",
      applicationNumber: "APP-20261127-4821",
      feeAmount: 500,
      currency: "BDT",
      redirectUrl: "https://sandbox.sslcommerz.com/EasyCheckOut/abc",
      transactionId: "SSLC-1732648800-a1b2c3d4",
    });

    const payRes = await service.initiateOnlinePayment("greenfield", {
      applicationNumber: "APP-20261127-4821",
      identifier: "01711000000",
      gateway: "sslcommerz",
      callbackBaseUrl: "https://school.example.com/admissions/payment-callback",
    });
    expect(payRes.redirectUrl).toContain("sslcommerz.com");

    erpClient.verifyOnlinePayment.mockResolvedValue({
      verified: true,
      applicationNumber: "APP-20261127-4821",
      paymentStatus: "PAID",
      paymentMethod: "SSLCOMMERZ",
      transactionId: "SSLC-1732648800-a1b2c3d4",
      feeAmount: 500,
      paidAt: "2026-11-27T01:00:00Z",
    });

    const verifyRes = await service.verifyOnlinePayment("greenfield", {
      applicationNumber: "APP-20261127-4821",
      identifier: "01711000000",
      gateway: "SSLCOMMERZ",
      transactionId: "SSLC-1732648800-a1b2c3d4",
      valId: "VAL_ID_123",
    });
    expect(erpClient.verifyOnlinePayment).toHaveBeenCalledWith(
      mockErpConfig.baseUrl,
      mockErpConfig.apiKey,
      expect.objectContaining({ valId: "VAL_ID_123" }),
    );
    expect(verifyRes.paymentStatus).toBe("PAID");

    erpClient.submitManualPayment.mockResolvedValue({
      paymentStatus: "UNDER_VERIFICATION",
      feeAmount: 500,
      transactionId: "9K4M2P7Q1X",
    });
    const manualRes = await service.submitManualPayment("greenfield", {
      applicationNumber: "APP-20261127-4821",
      identifier: "01711000000",
      paymentMethod: "bkash",
      transactionId: "9K4M2P7Q1X",
      paymentNote: "Sent from 01711000000",
    });
    expect(manualRes.paymentStatus).toBe("UNDER_VERIFICATION");

    prisma.admissionApplication.findFirst.mockResolvedValue(null);
    erpClient.trackAdmission.mockResolvedValue({
      applicationNumber: "APP-20261127-4821",
      studentName: "Arafat Rahman",
      appliedClassName: "Class 6",
      status: "SUBMITTED",
      feeAmount: 500,
      paymentStatus: "PAID",
      paymentMethod: "SSLCOMMERZ",
      transactionId: "SSLC-1732648800-a1b2c3d4",
      paidAt: "2026-11-27T01:00:00Z",
      photoUrl: "data:image/webp;base64,testphoto",
    });
    const trackRes = await service.track(
      "APP-20261127-4821",
      "01711000000",
      "greenfield",
    );
    expect(trackRes.paymentStatus).toBe("PAID");
    expect(trackRes.feeAmount).toBe(500);
    expect(trackRes.transactionId).toBe("SSLC-1732648800-a1b2c3d4");
    expect(trackRes.photoUrl).toBe("data:image/webp;base64,testphoto");
  });
});

