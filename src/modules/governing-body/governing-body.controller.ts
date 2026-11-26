import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SchoolRole } from "@prisma/client";
import { GoverningBodyService } from "./governing-body.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import {
  CreateGoverningMemberDto,
  GoverningMemberQueryDto,
  UpdateGoverningMemberDto,
} from "./dto/governing-body.dto";

@ApiTags("Governing Body & Committee")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/governing-body")
export class GoverningBodyController {
  constructor(private readonly governingBodyService: GoverningBodyService) {}

  @Get()
  @ApiOperation({
    summary:
      "List school governing body / managing committee members with search and category filtering",
  })
  @ResponseMessage("Governing body members retrieved successfully")
  async getMembers(
    @Param("id") id: string,
    @Query() query: GoverningMemberQueryDto,
  ) {
    return this.governingBodyService.getMembers(id, query);
  }

  @Get(":memberId")
  @ApiOperation({ summary: "Get single governing body member by ID" })
  @ResponseMessage("Governing body member details retrieved")
  async getMemberById(
    @Param("id") id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
  ) {
    return this.governingBodyService.getMemberById(id, memberId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Create governing body member" })
  @ResponseMessage("Governing body member created successfully")
  async createMember(
    @Param("id") id: string,
    @Body() dto: CreateGoverningMemberDto,
  ) {
    return this.governingBodyService.createMember(id, dto);
  }

  @Patch(":memberId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update governing body member" })
  @ResponseMessage("Governing body member updated successfully")
  async updateMember(
    @Param("id") id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateGoverningMemberDto,
  ) {
    return this.governingBodyService.updateMember(id, memberId, dto);
  }

  @Delete(":memberId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete governing body member" })
  @ResponseMessage("Governing body member deleted successfully")
  async deleteMember(
    @Param("id") id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
  ) {
    return this.governingBodyService.deleteMember(id, memberId);
  }
}

