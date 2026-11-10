import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PublishingService } from "./publishing.service";
import { BackupRestoreService } from "./backup-restore.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreateBackupDto,
  ReleaseVersionDto,
  RestoreVersionDto,
} from "./dto/publishing.dto";

@ApiTags("Publishing & Version Control")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/publishing")
export class PublishingController {
  constructor(
    private readonly publishingService: PublishingService,
    private readonly backupRestoreService: BackupRestoreService,
  ) {}

  @Get("status")
  @ApiOperation({
    summary: "Get publishing readiness, staged changes and version history",
  })
  @ResponseMessage("Publishing status retrieved successfully")
  async getPublishingStatus(@Param("id") id: string) {
    return this.publishingService.getPublishingStatus(id);
  }

  @Post("release")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({
    summary: "Publish staged changes and create new website version snapshot",
  })
  @ResponseMessage("New website version published successfully")
  async releaseVersion(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ReleaseVersionDto,
  ) {
    return this.publishingService.releaseVersion(id, userId, dto);
  }

  @Post("toggle-status")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Publish or unpublish public school website" })
  @ResponseMessage("Website publication status toggled")
  async setPublishStatus(
    @Param("id") id: string,
    @Body("isPublished") isPublished: boolean,
  ) {
    return this.publishingService.setPublishStatus(id, isPublished);
  }

  @Post("backups")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Create an on-demand full website snapshot backup" })
  @ResponseMessage("Website backup snapshot created successfully")
  async createBackup(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backupRestoreService.createBackup(id, userId, dto);
  }

  @Post("versions/:versionId/restore")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "One-click rollback to a previous version snapshot" })
  @ResponseMessage("Website revision successfully restored")
  async restoreVersion(
    @Param("id") id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: RestoreVersionDto,
  ) {
    return this.backupRestoreService.restoreVersion(id, versionId, userId, dto);
  }

  @Get("versions/:versionId")
  @ApiOperation({ summary: "Get snapshot payload of a specific version" })
  @ResponseMessage("Version details retrieved successfully")
  async getVersionDetails(
    @Param("id") id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
  ) {
    return this.backupRestoreService.getVersionDetails(id, versionId);
  }

  @Delete("versions/:versionId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete an archived version snapshot" })
  @ResponseMessage("Version snapshot deleted successfully")
  async deleteVersion(
    @Param("id") id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
  ) {
    return this.backupRestoreService.deleteVersion(id, versionId);
  }
}
