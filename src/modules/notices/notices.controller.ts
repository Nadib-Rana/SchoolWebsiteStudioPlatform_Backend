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
import { NoticesService } from "./notices.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeQueryDto,
} from "./dto/notices.dto";

@ApiTags("Notices & Announcements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/notices")
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  @ApiOperation({ summary: "List school notices with filtering and search" })
  @ResponseMessage("Notices retrieved successfully")
  async getNotices(@Param("id") id: string, @Query() query: NoticeQueryDto) {
    return this.noticesService.getNotices(id, query);
  }

  @Get(":noticeId")
  @ApiOperation({ summary: "Get single notice by ID" })
  @ResponseMessage("Notice details retrieved")
  async getNoticeById(
    @Param("id") id: string,
    @Param("noticeId", ParseUUIDPipe) noticeId: string,
  ) {
    return this.noticesService.getNoticeById(id, noticeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(
    SchoolRole.OWNER,
    SchoolRole.ADMIN,
    SchoolRole.EDITOR,
    SchoolRole.CONTENT_MANAGER,
  )
  @ApiOperation({ summary: "Create notice or announcement" })
  @ResponseMessage("Notice created successfully")
  async createNotice(@Param("id") id: string, @Body() dto: CreateNoticeDto) {
    return this.noticesService.createNotice(id, dto);
  }

  @Patch(":noticeId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(
    SchoolRole.OWNER,
    SchoolRole.ADMIN,
    SchoolRole.EDITOR,
    SchoolRole.CONTENT_MANAGER,
  )
  @ApiOperation({ summary: "Update notice" })
  @ResponseMessage("Notice updated successfully")
  async updateNotice(
    @Param("id") id: string,
    @Param("noticeId", ParseUUIDPipe) noticeId: string,
    @Body() dto: UpdateNoticeDto,
  ) {
    return this.noticesService.updateNotice(id, noticeId, dto);
  }

  @Delete(":noticeId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete notice" })
  @ResponseMessage("Notice deleted successfully")
  async deleteNotice(
    @Param("id") id: string,
    @Param("noticeId", ParseUUIDPipe) noticeId: string,
  ) {
    return this.noticesService.deleteNotice(id, noticeId);
  }
}
