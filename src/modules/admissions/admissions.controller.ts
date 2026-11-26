import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AdmissionsService } from "./admissions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { Throttle } from "@nestjs/throttler";
import {
  ApplyAdmissionDto,
  TrackAdmissionDto,
  UpdateAdmissionStatusDto,
  AdmissionQueryDto,
  PayOnlineAdmissionDto,
  VerifyOnlinePaymentDto,
  PayManualAdmissionDto,
} from "./dto/admissions.dto";

@ApiTags("Admissions")
@Controller()
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Public()
  @Get("public/admissions/:schoolSlug/classes")
  @ApiOperation({
    summary: "Get open admission classes for a school (from ERP or local fallback)",
  })
  @ResponseMessage("Admission classes retrieved successfully")
  async getPublicClasses(@Param("schoolSlug") schoolSlug: string) {
    return this.admissionsService.getPublicClasses(schoolSlug);
  }

  @Public()
  @Get("public/admissions/:schoolSlug/fee-config")
  @ApiOperation({
    summary: "Get school admission fee policy & active online/manual payment gateways",
  })
  @ResponseMessage("Admission fee configuration retrieved successfully")
  async getPublicFeeConfig(@Param("schoolSlug") schoolSlug: string) {
    return this.admissionsService.getPublicFeeConfig(schoolSlug);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("public/admissions/:schoolSlug/pay-online")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Initiate online admission fee payment via school's enabled ERP gateway",
  })
  @ResponseMessage("Online payment session created successfully")
  async initiateOnlinePayment(
    @Param("schoolSlug") schoolSlug: string,
    @Body() dto: PayOnlineAdmissionDto,
  ) {
    return this.admissionsService.initiateOnlinePayment(schoolSlug, dto);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post("public/admissions/:schoolSlug/verify-online-payment")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify completed online payment callback with School ERP",
  })
  @ResponseMessage("Online payment verified successfully")
  async verifyOnlinePayment(
    @Param("schoolSlug") schoolSlug: string,
    @Body() dto: VerifyOnlinePaymentDto,
  ) {
    return this.admissionsService.verifyOnlinePayment(schoolSlug, dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("public/admissions/:schoolSlug/pay-manual")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Submit manual MFS / bank TrxID payment details to School ERP",
  })
  @ResponseMessage("Manual payment submitted for verification")
  async submitManualPayment(
    @Param("schoolSlug") schoolSlug: string,
    @Body() dto: PayManualAdmissionDto,
  ) {
    return this.admissionsService.submitManualPayment(schoolSlug, dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("public/admissions/apply")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Submit public student admission application" })
  @ResponseMessage("Admission application submitted successfully")
  async apply(@Body() dto: ApplyAdmissionDto) {
    return this.admissionsService.apply(dto);
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @Get("public/admissions/track")
  @ApiOperation({
    summary: "Track admission application status by reference number",
  })
  @ResponseMessage("Application status retrieved successfully")
  async track(@Query() query: TrackAdmissionDto) {
    return this.admissionsService.track(
      query.applicationNumber,
      query.identifier || query.guardianPhone,
      query.schoolSlug,
    );
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @Post("public/admissions/track")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Track admission application status (POST)",
  })
  @ResponseMessage("Application status retrieved successfully")
  async trackPost(@Body() body: TrackAdmissionDto) {
    return this.admissionsService.track(
      body.applicationNumber,
      body.identifier || body.guardianPhone,
      body.schoolSlug,
    );
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get("public/:schoolSlug/alumni/verify")
  @ApiOperation({
    summary: "Verify alumni admission number against school ERP",
  })
  @ResponseMessage("Alumni verification completed")
  async verifyAlumni(
    @Param("schoolSlug") schoolSlug: string,
    @Query("code") code: string,
  ) {
    return this.admissionsService.verifyAlumni(schoolSlug, code);
  }

  // --- Studio Admission Management (Authenticated) ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get("schools/:id/admissions")
  @ApiOperation({ summary: "List school admission applications" })
  @ResponseMessage("Admission applications retrieved successfully")
  async findAll(@Param("id") id: string, @Query() query: AdmissionQueryDto) {
    return this.admissionsService.findAll(id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get("schools/:id/admissions/:appId")
  @ApiOperation({ summary: "Get single admission application details" })
  @ResponseMessage("Admission application retrieved successfully")
  async findOne(
    @Param("id") id: string,
    @Param("appId", ParseUUIDPipe) appId: string,
  ) {
    return this.admissionsService.findOne(id, appId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @Patch("schools/:id/admissions/:appId/status")
  @ApiOperation({ summary: "Update admission application status or notes" })
  @ResponseMessage("Admission application status updated")
  async updateStatus(
    @Param("id") id: string,
    @Param("appId", ParseUUIDPipe) appId: string,
    @Body() dto: UpdateAdmissionStatusDto,
  ) {
    return this.admissionsService.updateStatus(id, appId, dto);
  }
}
