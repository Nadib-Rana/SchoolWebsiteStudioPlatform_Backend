import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ThemeService } from "./theme.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateThemeDraftDto } from "./dto/theme.dto";

@ApiTags("Theme Customization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/theme")
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get()
  @ApiOperation({ summary: "Get school theme configuration and draft state" })
  @ResponseMessage("Theme configuration retrieved successfully")
  async getTheme(@Param("id") id: string) {
    return this.themeService.getTheme(id);
  }

  @Patch("draft")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Save draft theme and customizer properties" })
  @ResponseMessage("Draft theme saved successfully")
  async saveDraft(@Param("id") id: string, @Body() dto: UpdateThemeDraftDto) {
    return this.themeService.saveDraft(id, dto);
  }

  @Post("publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({
    summary: "Publish draft theme configuration to live website",
  })
  @ResponseMessage("Theme published to live site successfully")
  async publishTheme(@Param("id") id: string) {
    return this.themeService.publishTheme(id);
  }
}
