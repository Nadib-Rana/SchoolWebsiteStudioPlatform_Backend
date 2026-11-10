import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";

@ApiTags("Audit Logs & Activity Timeline")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
@Controller("schools/:id/audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @SchoolRoles(
    SchoolRole.OWNER,
    SchoolRole.ADMIN,
    SchoolRole.EDITOR,
    SchoolRole.ANALYST,
  )
  @ApiOperation({ summary: "Get audit logging timeline for school workspace" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ResponseMessage("Audit logs retrieved successfully")
  async getSchoolLogs(
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.getSchoolLogs(id, limit);
  }
}
