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
  @Get("public/schools")
  @ApiOperation({
    summary: "List all published schools for sitemap and directory discovery",
  })
  @ResponseMessage("Published schools retrieved successfully")
  async getPublishedSchools() {
    return this.publicSiteService.getPublishedSchools();
  }

  @Public()
  @Get("public/site")
  @ApiOperation({
    summary: "Get complete public school website data by slug or domain",
  })
  @ResponseMessage("Public site data loaded successfully")
  async getPublicSite(@Query("slug") slug?: string, @Req() req?: Request) {
    // If slug query provided, use it; otherwise fallback to hostname header
    const identifier = slug || req?.hostname || "northfield-high";
    return this.publicSiteService.getPublicSite(identifier);
  }

  @Public()
  @Post("public/inquiries")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit public contact inquiry or admission question",
  })
  @ResponseMessage("Inquiry submitted successfully. We will be in touch soon.")
  async createInquiry(@Body() dto: ContactInquiryDto) {
    return this.publicSiteService.createInquiry(dto);
  }

  @Public()
  @Get("public/:slug/notices/:noticeId")
  @ApiOperation({ summary: "Get single published notice by ID or slug" })
  @ResponseMessage("Notice retrieved successfully")
  async getPublicNotice(
    @Param("slug") slug: string,
    @Param("noticeId") noticeId: string,
  ) {
    return this.publicSiteService.getPublicNotice(slug, noticeId);
  }

  @Public()
  @Get("public/:slug/events/:eventId")
  @ApiOperation({ summary: "Get single published event" })
  @ResponseMessage("Event retrieved successfully")
  async getPublicEvent(
    @Param("slug") slug: string,
    @Param("eventId", ParseUUIDPipe) eventId: string,
  ) {
    return this.publicSiteService.getPublicEvent(slug, eventId);
  }

  @Public()
  @Get("public/:slug/teachers/:teacherId")
  @ApiOperation({ summary: "Get single active teacher" })
  @ResponseMessage("Teacher retrieved successfully")
  async getPublicTeacher(
    @Param("slug") slug: string,
    @Param("teacherId", ParseUUIDPipe) teacherId: string,
  ) {
    return this.publicSiteService.getPublicTeacher(slug, teacherId);
  }

  @Public()
  @Get("public/:slug/albums/:albumId")
  @ApiOperation({ summary: "Get single gallery album with photos" })
  @ResponseMessage("Album retrieved successfully")
  async getPublicAlbum(
    @Param("slug") slug: string,
    @Param("albumId") albumId: string,
  ) {
    return this.publicSiteService.getPublicAlbum(slug, albumId);
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @Delete("schools/:id/inquiries/:inquiryId")
  @ApiOperation({ summary: "Delete a contact inquiry" })
  @ResponseMessage("Inquiry deleted successfully")
  async deleteInquiry(
    @Param("id") id: string,
    @Param("inquiryId", ParseUUIDPipe) inquiryId: string,
  ) {
    return this.publicSiteService.deleteInquiry(id, inquiryId);
  }
}
