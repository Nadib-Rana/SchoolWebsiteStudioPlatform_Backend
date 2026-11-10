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
import { I18nService } from "./i18n.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateSettingsDto } from "./dto/settings.dto";
import { UpdateI18nDto } from "./dto/i18n.dto";

@ApiTags("School Settings & i18n")
@Controller()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly i18nService: I18nService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get("schools/:id/settings")
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
  @Patch("schools/:id/settings")
  @ApiOperation({ summary: "Update school settings and preferences" })
  @ResponseMessage("Settings updated successfully")
  async updateSettings(
    @Param("id") id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get("schools/:id/settings/i18n")
  @ApiOperation({ summary: "Get school multi-language i18n configuration" })
  @ResponseMessage("i18n configuration retrieved successfully")
  async getI18nSettings(@Param("id") id: string) {
    return this.i18nService.getI18nSettings(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @Patch("schools/:id/settings/i18n")
  @ApiOperation({ summary: "Update supported languages and translation overrides" })
  @ResponseMessage("i18n configuration updated successfully")
  async updateI18nSettings(
    @Param("id") id: string,
    @Body() dto: UpdateI18nDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.i18nService.updateI18nSettings(id, dto, userId);
  }

  @Public()
  @Get("public/i18n/:slug")
  @ApiOperation({ summary: "Get public site supported languages and overrides" })
  @ResponseMessage("Public i18n configuration retrieved")
  async getPublicI18n(@Param("slug") slug: string) {
    return this.i18nService.getPublicI18n(slug);
  }
}
