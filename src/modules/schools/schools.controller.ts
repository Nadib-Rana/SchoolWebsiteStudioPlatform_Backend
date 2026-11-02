import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { SchoolsService } from "./schools.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentSchool } from "../../common/decorators/current-school.decorator";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole, School } from "@prisma/client";
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  OnboardingDto,
  AddMemberDto,
} from "./dto/school.dto";

@ApiTags("Schools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get("my-schools")
  @ApiOperation({ summary: "Get all schools where current user is a member" })
  @ResponseMessage("Schools retrieved successfully")
  async getMySchools(@CurrentUser("id") userId: string) {
    return this.schoolsService.getMySchools(userId);
  }

  @Post("onboarding")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create and provision new school via onboarding wizard" })
  @ResponseMessage("School onboarded and provisioned successfully")
  async onboarding(
    @CurrentUser("id") userId: string,
    @Body() dto: OnboardingDto,
  ) {
    return this.schoolsService.onboarding(userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new school tenant" })
  @ResponseMessage("School created successfully")
  async createSchool(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateSchoolDto,
  ) {
    return this.schoolsService.createSchool(userId, dto);
  }

  @Get(":id")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "Get school details by ID or slug" })
  @ResponseMessage("School details retrieved")
  async getSchoolById(@Param("id") id: string) {
    return this.schoolsService.getSchoolById(id);
  }

  @Get(":id/overview")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "Get studio dashboard overview metrics, activities and stats" })
  @ResponseMessage("Overview data retrieved")
  async getOverview(@Param("id") id: string) {
    return this.schoolsService.getOverview(id);
  }

  @Patch(":id")
  @UseGuards(TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Update school settings and metadata" })
  @ResponseMessage("School updated successfully")
  async updateSchool(
    @Param("id") id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.updateSchool(id, dto);
  }

  @Get(":id/members")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "Get school team members and assigned roles" })
  @ResponseMessage("Members retrieved successfully")
  async getMembers(@Param("id") id: string) {
    return this.schoolsService.getMembers(id);
  }

  @Post(":id/members")
  @UseGuards(TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Invite or add a team member to school" })
  @ResponseMessage("Member added successfully")
  async addMember(
    @Param("id") id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.schoolsService.addMember(id, dto);
  }

  @Delete(":id/members/:memberId")
  @UseGuards(TenantGuard, SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER)
  @ApiOperation({ summary: "Remove team member from school" })
  @ResponseMessage("Member removed successfully")
  async removeMember(
    @Param("id") id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
  ) {
    return this.schoolsService.removeMember(id, memberId);
  }
}
