import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PublishingService } from "./publishing.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { ReleaseVersionDto } from "./dto/publishing.dto";

@ApiTags("Publishing & Version Control")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/publishing")
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

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
}
