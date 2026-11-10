import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AddMemberDto } from "./dto/school.dto";
import { SchoolRole } from "@prisma/client";

@Injectable()
export class SchoolMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySchools(userId: string) {
    const members = await this.prisma.schoolMember.findMany({
      where: { userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            customDomain: true,
            logoUrl: true,
            plan: true,
            isPublished: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return members.map((m) => ({
      membershipId: m.id,
      role: m.role,
      isDefault: m.isDefault,
      school: m.school,
    }));
  }

  async getMembers(schoolId: string) {
    return this.prisma.schoolMember.findMany({
      where: { schoolId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async addMember(schoolId: string, dto: AddMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException(
        "User with this email not found on the platform",
      );
    }

    const existingMember = await this.prisma.schoolMember.findUnique({
      where: {
        schoolId_userId: {
          schoolId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException("User is already a member of this school");
    }

    return this.prisma.schoolMember.create({
      data: {
        schoolId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(schoolId: string, memberId: string) {
    const member = await this.prisma.schoolMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.schoolId !== schoolId) {
      throw new NotFoundException("Member not found in this school");
    }

    if (member.role === SchoolRole.OWNER) {
      const ownerCount = await this.prisma.schoolMember.count({
        where: { schoolId, role: SchoolRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Cannot remove the only owner of the school",
        );
      }
    }

    await this.prisma.schoolMember.delete({
      where: { id: memberId },
    });

    return { message: "Member removed successfully" };
  }
}
