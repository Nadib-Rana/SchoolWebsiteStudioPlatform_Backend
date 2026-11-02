import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Role, SchoolRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // 1. Identify schoolId from params, headers, or query
    let schoolId: string | undefined =
      req.params?.schoolId ||
      req.params?.id ||
      (req.headers["x-school-id"] as string) ||
      (req.query?.schoolId as string);

    // 2. If no schoolId explicitly passed and user is authenticated, find user's default school
    if (!schoolId && user?.id) {
      const defaultMember = await this.prisma.schoolMember.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (defaultMember) {
        schoolId = defaultMember.schoolId;
      }
    }

    if (!schoolId) {
      throw new NotFoundException("School context could not be identified");
    }

    // 3. Find the school
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId);
    const school = await this.prisma.school.findFirst({
      where: {
        OR: [
          { slug: schoolId },
          ...(isUuid ? [{ id: schoolId }] : []),
        ],
        deletedAt: null,
      },
    });

    if (!school) {
      throw new NotFoundException(`School '${schoolId}' not found`);
    }

    req.school = school;

    // 4. If user is authenticated, check membership & permission
    if (user?.id) {
      if (user.role === Role.SUPER_ADMIN) {
        req.schoolMember = {
          id: "superadmin-member",
          schoolId: school.id,
          userId: user.id,
          role: SchoolRole.OWNER,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return true;
      }

      const member = await this.prisma.schoolMember.findUnique({
        where: {
          schoolId_userId: {
            schoolId: school.id,
            userId: user.id,
          },
        },
      });

      if (!member) {
        throw new ForbiddenException(
          "You are not an authorized member of this school",
        );
      }

      req.schoolMember = member;
    }

    return true;
  }
}
