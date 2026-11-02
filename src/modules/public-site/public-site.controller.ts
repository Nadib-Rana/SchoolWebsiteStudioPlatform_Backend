import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { PublicSiteService } from "./public-site.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  ContactInquiryDto,
  UpdateInquiryStatusDto,
} from "./dto/public-site.dto";

@ApiTags("Public Website Delivery")
@Controller()
export class PublicSiteController {
  constructor(private readonly publicSiteService: PublicSiteService) {}

  @Public()
  @Get("public/site")
  @ApiOperation({ summary: "Get complete public school website data by slug or domain" })
  @ResponseMessage("Public site data loaded successfully")
  async getPublicSite(
    @Query("slug") slug?: string,
    @Req() req?: Request,
  ) {
    // If slug query provided, use it; otherwise fallback to hostname header
    const identifier = slug || req?.hostname || "northfield-high";
    return this.publicSiteService.getPublicSite(identifier);
  }

  @Public()
  @Post("public/inquiries")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Submit public contact inquiry or admission question" })
  @ResponseMessage("Inquiry submitted successfully. We will be in touch soon.")
  async createInquiry(@Body() dto: ContactInquiryDto) {
    return this.publicSiteService.createInquiry(dto);
  }

  // --- Studio Inquiries Management (Authenticated) ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get("schools/:id/inquiries")
  @ApiOperation({ summary: "Get all received contact inquiries (Studio)" })
  @ResponseMessage("Inquiries retrieved successfully")
  async getInquiries(@Param("id") id: string) {
    return this.publicSiteService.getInquiries(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @Patch("schools/:id/inquiries/:inquiryId")
  @ApiOperation({ summary: "Update inquiry status or add response notes" })
  @ResponseMessage("Inquiry updated successfully")
  async updateInquiryStatus(
    @Param("id") id: string,
    @Param("inquiryId", ParseUUIDPipe) inquiryId: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.publicSiteService.updateInquiryStatus(id, inquiryId, dto);
  }
}
