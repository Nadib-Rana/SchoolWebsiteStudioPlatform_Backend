import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { AddMemberDto, UpdateMemberRoleDto } from "./dto/school.dto";
import { SchoolRole, UserStatus, Role } from "@prisma/client";
import { HashUtil } from "../../common/utils/hash.util";
import * as crypto from "crypto";

@Injectable()
export class SchoolMembersService {
  private readonly logger = new Logger(SchoolMembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, slug: true },
    });
    if (!school) throw new NotFoundException("School not found");

    const email = dto.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email } });
    let tempPassword = "";

    if (!user) {
      tempPassword = `Studio#${crypto.randomBytes(4).toString("hex")}`;
      const hashedPassword = await HashUtil.hash(tempPassword);
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: email.split("@")[0],
          role: Role.USER,
          status: UserStatus.ACTIVE,
        },
      });
    }

    const existingMember = await this.prisma.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId, userId: user.id } },
    });
    if (existingMember) {
      throw new ConflictException("User is already a team member of this school");
    }

    const member = await this.prisma.schoolMember.create({
      data: { schoolId, userId: user.id, role: dto.role },
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
    });

    const inviteMsg = tempPassword
      ? `You have been invited to join ${school.name} on SchoolCanvas Website Studio as ${dto.role}.\n\nYour temporary password is: ${tempPassword}\nPlease login and update your password.`
      : `You have been added to ${school.name} team on SchoolCanvas Website Studio as ${dto.role}.`;

    void this.mailService
      .sendNotification(email, user.firstName || "Colleague", `Invitation to ${school.name} Studio`, inviteMsg)
      .catch((err) => this.logger.warn(`Failed to dispatch staff invitation email: ${err.message}`));

    return member;
  }

  async updateMemberRole(schoolId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const member = await this.prisma.schoolMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true, firstName: true } } },
    });
    if (!member || member.schoolId !== schoolId) {
      throw new NotFoundException("Member not found in this school");
    }

    if (member.role === SchoolRole.OWNER && dto.role !== SchoolRole.OWNER) {
      const ownerCount = await this.prisma.schoolMember.count({
        where: { schoolId, role: SchoolRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException("Cannot demote the only owner of the school");
      }
    }

    return this.prisma.schoolMember.update({
      where: { id: memberId },
      data: { role: dto.role },
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
        throw new BadRequestException("Cannot remove the only owner of the school");
      }
    }

    await this.prisma.schoolMember.delete({ where: { id: memberId } });
    return { message: "Member removed successfully" };
  }
}
