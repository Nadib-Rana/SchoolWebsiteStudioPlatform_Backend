import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { TeachersService } from "./teachers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherQueryDto,
} from "./dto/teachers.dto";

@ApiTags("Teachers & Faculty")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/teachers")
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @ApiOperation({ summary: "List school teachers with search and department filtering" })
  @ResponseMessage("Teachers retrieved successfully")
  async getTeachers(
    @Param("id") id: string,
    @Query() query: TeacherQueryDto,
  ) {
    return this.teachersService.getTeachers(id, query);
  }

  @Get(":teacherId")
  @ApiOperation({ summary: "Get single teacher profile by ID" })
  @ResponseMessage("Teacher details retrieved")
  async getTeacherById(
    @Param("id") id: string,
    @Param("teacherId", ParseUUIDPipe) teacherId: string,
  ) {
    return this.teachersService.getTeacherById(id, teacherId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Create teacher profile" })
  @ResponseMessage("Teacher created successfully")
  async createTeacher(
    @Param("id") id: string,
    @Body() dto: CreateTeacherDto,
  ) {
    return this.teachersService.createTeacher(id, dto);
  }

  @Patch(":teacherId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update teacher profile" })
  @ResponseMessage("Teacher updated successfully")
  async updateTeacher(
    @Param("id") id: string,
    @Param("teacherId", ParseUUIDPipe) teacherId: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.updateTeacher(id, teacherId, dto);
  }

  @Delete(":teacherId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete teacher profile" })
  @ResponseMessage("Teacher deleted successfully")
  async deleteTeacher(
    @Param("id") id: string,
    @Param("teacherId", ParseUUIDPipe) teacherId: string,
  ) {
    return this.teachersService.deleteTeacher(id, teacherId);
  }
}
