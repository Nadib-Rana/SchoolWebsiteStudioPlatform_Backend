import { NotFoundException } from "@nestjs/common";
import { GoverningBodyService } from "./governing-body.service";

describe("GoverningBodyService", () => {
  let service: GoverningBodyService;
  let prisma: {
    governingMember: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      governingMember: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new GoverningBodyService(prisma as any);
  });

  it("lists governing body members filtered by category and search with featured/order sort", async () => {
    const mockMembers = [
      {
        id: "m-1",
        schoolId: "school-1",
        name: "Alhaj Habibur Rahman",
        designation: "Chairman",
        category: "MANAGING_COMMITTEE",
        isFeatured: true,
        order: 1,
        status: "ACTIVE",
      },
    ];
    prisma.governingMember.count.mockResolvedValue(1);
    prisma.governingMember.findMany.mockResolvedValue(mockMembers);

    const res = await service.getMembers("school-1", {
      category: "MANAGING_COMMITTEE",
      search: "Habibur",
      page: 1,
      limit: 20,
    });

    expect(res.items).toEqual(mockMembers);
    expect(res.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(prisma.governingMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
      }),
    );
  });

  it("creates a governing member with sanitized optional fields", async () => {
    prisma.governingMember.create.mockImplementation(async ({ data }) => ({
      id: "m-new",
      ...data,
    }));

    const created = await service.createMember("school-1", {
      name: "  Dr. Shamsul Alam  ",
      designation: "  President  ",
      category: "GOVERNING_BODY",
      termPeriod: " 2025-2027 ",
      email: "  ",
      isFeatured: true,
      order: 1,
    });

    expect(created.name).toBe("Dr. Shamsul Alam");
    expect(created.designation).toBe("President");
    expect(created.termPeriod).toBe("2025-2027");
    expect(created.email).toBeNull();
    expect(created.isFeatured).toBe(true);
  });

  it("updates an existing governing member", async () => {
    prisma.governingMember.findFirst.mockResolvedValue({
      id: "m-1",
      schoolId: "school-1",
    });
    prisma.governingMember.update.mockResolvedValue({
      id: "m-1",
      designation: "Vice Chairman",
      status: "INACTIVE",
    });

    const updated = await service.updateMember("school-1", "m-1", {
      designation: "Vice Chairman",
      status: "INACTIVE",
    });

    expect(updated.designation).toBe("Vice Chairman");
    expect(prisma.governingMember.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: {
        designation: "Vice Chairman",
        status: "INACTIVE",
      },
    });
  });

  it("throws NotFoundException when member is not found", async () => {
    prisma.governingMember.findFirst.mockResolvedValue(null);

    await expect(
      service.getMemberById("school-1", "missing-id"),
    ).rejects.toThrow(NotFoundException);
  });

  it("deletes a governing member after verifying tenant ownership", async () => {
    prisma.governingMember.findFirst.mockResolvedValue({
      id: "m-1",
      schoolId: "school-1",
    });
    prisma.governingMember.delete.mockResolvedValue({ id: "m-1" });

    const res = await service.deleteMember("school-1", "m-1");

    expect(res).toEqual({
      message: "Governing body member deleted successfully",
    });
    expect(prisma.governingMember.delete).toHaveBeenCalledWith({
      where: { id: "m-1" },
    });
  });
});

