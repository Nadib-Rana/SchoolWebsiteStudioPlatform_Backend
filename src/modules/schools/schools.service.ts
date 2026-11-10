import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  OnboardingDto,
  AddMemberDto,
} from "./dto/school.dto";
import { SchoolMembersService } from "./school-members.service";
import { SchoolOverviewService } from "./school-overview.service";
import { SchoolSetupService } from "./school-setup.service";

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: SchoolMembersService,
    private readonly overviewService: SchoolOverviewService,
    private readonly setupService: SchoolSetupService,
  ) {}

  async getMySchools(userId: string) {
    return this.membersService.getMySchools(userId);
  }

  async getSchoolById(schoolId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        schoolId,
      );

    const school = await this.prisma.school.findFirst({
      where: {
        OR: [{ slug: schoolId }, ...(isUuid ? [{ id: schoolId }] : [])],
        deletedAt: null,
      },
      include: {
        profile: true,
        themeConfig: true,
        seoConfig: true,
        settings: true,
        _count: {
          select: {
            pages: true,
            teachers: true,
            notices: true,
            events: true,
            albums: true,
            members: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    return school;
  }

  async getOverview(schoolId: string) {
    return this.overviewService.getOverview(schoolId);
  }

  async createSchool(userId: string, dto: CreateSchoolDto) {
    return this.setupService.createSchool(userId, dto);
  }

  async onboarding(userId: string, dto: OnboardingDto) {
    return this.setupService.onboarding(userId, dto);
  }

  async updateSchool(schoolId: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.customDomain !== undefined
          ? { customDomain: dto.customDomain }
          : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.isPublished !== undefined
          ? { isPublished: dto.isPublished }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async getMembers(schoolId: string) {
    return this.membersService.getMembers(schoolId);
  }

  async addMember(schoolId: string, dto: AddMemberDto) {
    return this.membersService.addMember(schoolId, dto);
  }

  async removeMember(schoolId: string, memberId: string) {
    return this.membersService.removeMember(schoolId, memberId);
  }
}
