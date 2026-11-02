import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SeoService } from "./seo.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { UpdateSeoDto } from "./dto/seo.dto";

@ApiTags("SEO & Metadata")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/seo")
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get()
  @ApiOperation({ summary: "Get SEO configuration and metadata preview" })
  @ResponseMessage("SEO configuration retrieved successfully")
  async getSeoConfig(@Param("id") id: string) {
    return this.seoService.getSeoConfig(id);
  }

  @Patch()
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update SEO configuration and search preview metadata" })
  @ResponseMessage("SEO configuration updated successfully")
  async updateSeoConfig(
    @Param("id") id: string,
    @Body() dto: UpdateSeoDto,
  ) {
    return this.seoService.updateSeoConfig(id, dto);
  }
}
