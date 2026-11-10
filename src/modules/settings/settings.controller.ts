import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateSettingsDto } from "./dto/settings.dto";

@ApiTags("School Settings")
@Controller("schools")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(":id/settings")
  @ApiOperation({
    summary: "Get school preferences, localization and security settings",
  })
  @ResponseMessage("Settings retrieved successfully")
  async getSettings(@Param("id") id: string) {
    return this.settingsService.getSettings(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @Patch(":id/settings")
  @ApiOperation({ summary: "Update school settings and preferences" })
  @ResponseMessage("Settings updated successfully")
  async updateSettings(
    @Param("id") id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(id, dto);
  }
}
