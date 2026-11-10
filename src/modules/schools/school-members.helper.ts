import { SchoolRole } from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
};

export interface RoleCapability {
  capability: string;
  category: string;
  description: string;
  roles: Record<SchoolRole, boolean>;
}

export const ROLE_PERMISSION_MATRIX: RoleCapability[] = [
  {
    capability: "Page & Visual Builder",
    category: "Design",
    description: "Create, edit and delete public pages and layout blocks",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: true,
      CONTENT_MANAGER: true,
      ANALYST: false,
    },
  },
  {
    capability: "Publish Releases & Rollbacks",
    category: "Releases",
    description: "Release changes to production and rollback to previous version snapshots",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: false,
      CONTENT_MANAGER: false,
      ANALYST: false,
    },
  },
  {
    capability: "Theme Customization",
    category: "Design",
    description: "Modify color palettes, typography and template presets",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: true,
      CONTENT_MANAGER: false,
      ANALYST: false,
    },
  },
  {
    capability: "Notices, Events & Gallery",
    category: "Content",
    description: "Post school announcements, academic events and photo albums",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: true,
      CONTENT_MANAGER: true,
      ANALYST: false,
    },
  },
  {
    capability: "Admissions CRM & Inquiries",
    category: "Operations",
    description: "View and respond to student inquiries and parent applications",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: true,
      CONTENT_MANAGER: true,
      ANALYST: false,
    },
  },
  {
    capability: "Custom Domains & SSL",
    category: "DevOps",
    description: "Verify DNS records and attach white-label custom domains",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: false,
      CONTENT_MANAGER: false,
      ANALYST: false,
    },
  },
  {
    capability: "Team Member Invitations & Roles",
    category: "Administration",
    description: "Invite school staff and modify membership permissions",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: false,
      CONTENT_MANAGER: false,
      ANALYST: false,
    },
  },
  {
    capability: "Analytics & Audit Logging",
    category: "Reports",
    description: "Inspect visitor traffic breakdowns, popular pages and security timeline",
    roles: {
      OWNER: true,
      ADMIN: true,
      EDITOR: true,
      CONTENT_MANAGER: true,
      ANALYST: true,
    },
  },
];

export async function assertOwnerLimit(prisma: PrismaService, schoolId: string, currentRole: SchoolRole, targetRole?: SchoolRole) {
  if (currentRole === SchoolRole.OWNER && (!targetRole || targetRole !== SchoolRole.OWNER)) {
    const ownerCount = await prisma.schoolMember.count({
      where: { schoolId, role: SchoolRole.OWNER },
    });
    if (ownerCount <= 1) {
      throw new BadRequestException("Cannot demote or remove the only owner of the school");
    }
  }
}

export function buildInviteEmail(
  schoolName: string,
  role: string,
  tempPassword?: string,
): string {
  if (tempPassword) {
    return `You have been invited to collaborate on ${schoolName} on SchoolCanvas Website Studio as ${role}.\n\nYour temporary password is: ${tempPassword}\nPlease sign in and update your credentials.`;
  }
  return `You have been added to the ${schoolName} team on SchoolCanvas Website Studio as ${role}.`;
}
