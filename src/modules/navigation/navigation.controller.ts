import { Controller, Get, Put, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NavigationService } from "./navigation.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateNavigationDto } from "./dto/navigation.dto";

@ApiTags("Navigation & Menus")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/navigation")
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @ApiOperation({ summary: "Get school navigation menus and item hierarchy" })
  @ResponseMessage("Navigation menus retrieved successfully")
  async getMenus(@Param("id") id: string) {
    return this.navigationService.getMenus(id);
  }

  @Put()
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update menu items and order" })
  @ResponseMessage("Navigation menu saved successfully")
  async updateMenu(@Param("id") id: string, @Body() dto: UpdateNavigationDto) {
    return this.navigationService.updateMenu(id, dto);
  }
}
