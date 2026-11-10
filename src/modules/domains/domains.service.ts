import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateDomainDto } from "./dto/domains.dto";
import { verifyDomainDns } from "./dns-verifier";

@Injectable()
export class DomainsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDomains(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { slug: true, customDomain: true },
    });

    const domains = await this.prisma.customDomain.findMany({
      where: { schoolId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return {
      subdomain: `${school?.slug}.schoolcanvas.app`,
      primaryDomain: school?.customDomain || null,
      customDomains: domains,
    };
  }

  async addDomain(schoolId: string, dto: CreateDomainDto) {
    const domainName = dto.domain.toLowerCase().trim().replace(/^https?:\/\//, "");

    const existing = await this.prisma.customDomain.findUnique({
      where: { domain: domainName },
    });

    if (existing) {
      throw new ConflictException("Domain is already registered by a school");
    }

    const dnsRecords = [
      { type: "CNAME", name: "www", value: "cname.schoolcanvas.app", status: "PENDING" },
      { type: "A", name: "@", value: "76.76.21.21", status: "PENDING" },
      { type: "TXT", name: "_studio-verify", value: `verify-token-${schoolId.slice(0, 8)}`, status: "PENDING" },
    ];

    return this.prisma.customDomain.create({
      data: {
        schoolId,
        domain: domainName,
        status: "PENDING_DNS",
        isPrimary: dto.isPrimary || false,
        dnsRecords,
      },
    });
  }

  async verifyDomain(schoolId: string, domainId: string, simulate = false) {
    const domain = await this.prisma.customDomain.findFirst({
      where: { id: domainId, schoolId },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found");
    }

    const check = await verifyDomainDns(domain.domain, schoolId, simulate);

    const updated = await this.prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: check.status,
        verifiedAt: check.verified ? new Date() : domain.verifiedAt,
        dnsRecords: check.dnsRecords as any,
      },
    });

    if (check.verified && domain.isPrimary) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: { customDomain: domain.domain },
      });
    }

    return {
      ...updated,
      sslStatus: check.sslStatus,
      sslDetails: check.sslDetails,
      verificationSuccess: check.verified,
    };
  }

  async setPrimary(schoolId: string, domainId: string) {
    const domain = await this.prisma.customDomain.findFirst({
      where: { id: domainId, schoolId },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found");
    }

    await this.prisma.customDomain.updateMany({
      where: { schoolId },
      data: { isPrimary: false },
    });

    await this.prisma.customDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    });

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { customDomain: domain.domain },
    });

    return { message: `${domain.domain} is now the primary domain` };
  }

  async removeDomain(schoolId: string, domainId: string) {
    const domain = await this.prisma.customDomain.findFirst({
      where: { id: domainId, schoolId },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found");
    }

    await this.prisma.customDomain.delete({
      where: { id: domainId },
    });

    if (domain.isPrimary) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: { customDomain: null },
      });
    }

    return { message: "Domain removed successfully" };
  }
}
