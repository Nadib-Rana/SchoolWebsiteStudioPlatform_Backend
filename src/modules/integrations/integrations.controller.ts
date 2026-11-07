import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IntegrationsService } from "./integrations.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { ConfigureIntegrationDto } from "./dto/integrations.dto";

@ApiTags("Integrations & ERP Sync")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: "Get all integrations and sync history" })
  @ResponseMessage("Integrations retrieved successfully")
  async getIntegrations(@Param("id") id: string) {
    return this.integrationsService.getIntegrations(id);
  }

  @Patch()
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Configure integration credentials and status" })
  @ResponseMessage("Integration configured successfully")
  async configureIntegration(
    @Param("id") id: string,
    @Body() dto: ConfigureIntegrationDto,
  ) {
    return this.integrationsService.configureIntegration(id, dto);
  }

  @Post(":type/sync")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Trigger manual data synchronization" })
  @ResponseMessage("Synchronization completed successfully")
  async triggerSync(@Param("id") id: string, @Param("type") type: string) {
    return this.integrationsService.triggerSync(id, type);
  }
}
