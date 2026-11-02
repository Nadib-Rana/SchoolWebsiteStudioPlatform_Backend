import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContentService } from "./content.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateContentDto } from "./dto/content.dto";

@ApiTags("Content Management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: "Get all 8 school content sections and completion status" })
  @ResponseMessage("School content retrieved successfully")
  async getContent(@Param("id") id: string) {
    return this.contentService.getContent(id);
  }

  @Patch()
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR, SchoolRole.CONTENT_MANAGER)
  @ApiOperation({ summary: "Update school content sections and details" })
  @ResponseMessage("School content updated successfully")
  async updateContent(
    @Param("id") id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.updateContent(id, dto);
  }
}
