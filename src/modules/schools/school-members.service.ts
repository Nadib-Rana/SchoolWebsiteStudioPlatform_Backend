import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuditService } from "../audit/audit.service";
import { AddMemberDto, UpdateMemberRoleDto } from "./dto/school.dto";
import { SchoolRole, UserStatus, Role } from "@prisma/client";
import { HashUtil } from "../../common/utils/hash.util";
import * as crypto from "crypto";
import {
  USER_SELECT_FIELDS,
  ROLE_PERMISSION_MATRIX,
  assertOwnerLimit,
  buildInviteEmail,
} from "./school-members.helper";

@Injectable()
export class SchoolMembersService {
  private readonly logger = new Logger(SchoolMembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
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
      include: { user: { select: USER_SELECT_FIELDS } },
      orderBy: { createdAt: "asc" },
    });
  }

  getPermissionMatrix() {
    return {
      roles: [
        SchoolRole.OWNER,
        SchoolRole.ADMIN,
        SchoolRole.EDITOR,
        SchoolRole.CONTENT_MANAGER,
        SchoolRole.ANALYST,
      ],
      capabilities: ROLE_PERMISSION_MATRIX,
    };
  }

  async addMember(schoolId: string, dto: AddMemberDto, actorId?: string) {
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
      include: { user: { select: USER_SELECT_FIELDS } },
    });

    const inviteMsg = buildInviteEmail(school.name, dto.role, tempPassword);
    void this.mailService
      .sendNotification(email, user.firstName || "Colleague", `Invitation to ${school.name} Studio`, inviteMsg)
      .catch((err) => this.logger.warn(`Failed to dispatch staff invitation email: ${err.message}`));

    if (actorId) {
      await this.auditService.log({
        schoolId,
        userId: actorId,
        action: "MEMBER_INVITED",
        entity: "SchoolMember",
        entityId: member.id,
        details: { invitedEmail: email, role: dto.role },
      });
    }

    return member;
  }

  async updateMemberRole(schoolId: string, memberId: string, dto: UpdateMemberRoleDto, actorId?: string) {
    const member = await this.prisma.schoolMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });
    if (!member || member.schoolId !== schoolId) {
      throw new NotFoundException("Member not found in this school");
    }

    await assertOwnerLimit(this.prisma, schoolId, member.role, dto.role);

    const updated = await this.prisma.schoolMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: { select: USER_SELECT_FIELDS } },
    });

    if (actorId) {
      await this.auditService.log({
        schoolId,
        userId: actorId,
        action: "MEMBER_ROLE_UPDATED",
        entity: "SchoolMember",
        entityId: member.id,
        details: { memberEmail: member.user?.email, previousRole: member.role, newRole: dto.role },
      });
    }

    return updated;
  }

  async removeMember(schoolId: string, memberId: string, actorId?: string) {
    const member = await this.prisma.schoolMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });
    if (!member || member.schoolId !== schoolId) {
      throw new NotFoundException("Member not found in this school");
    }

    await assertOwnerLimit(this.prisma, schoolId, member.role);
    await this.prisma.schoolMember.delete({ where: { id: memberId } });

    if (actorId) {
      await this.auditService.log({
        schoolId,
        userId: actorId,
        action: "MEMBER_REMOVED",
        entity: "SchoolMember",
        entityId: memberId,
        details: { memberEmail: member.user?.email, previousRole: member.role },
      });
    }

    return { message: "Member removed successfully" };
  }
}
