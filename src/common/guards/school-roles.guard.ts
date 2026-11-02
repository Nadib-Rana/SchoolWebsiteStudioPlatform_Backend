import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SchoolRole } from "@prisma/client";
import { SCHOOL_ROLES_KEY } from "../decorators/school-roles.decorator";

@Injectable()
export class SchoolRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SchoolRole[]>(
      SCHOOL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { schoolMember } = context.switchToHttp().getRequest();

    if (!schoolMember || !schoolMember.role) {
      throw new ForbiddenException("Access denied: No school membership role found");
    }

    // OWNER has full access to all school resources
    if (schoolMember.role === SchoolRole.OWNER) {
      return true;
    }

    const hasRole = requiredRoles.includes(schoolMember.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required school role(s) [${requiredRoles.join(", ")}], but member has [${schoolMember.role}]`,
      );
    }

    return true;
  }
}
