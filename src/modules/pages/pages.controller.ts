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
import { PagesService } from "./pages.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreatePageDto,
  UpdatePageDto,
  PageQueryDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from "./dto/pages.dto";

@ApiTags("Pages & Builder")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/pages")
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: "List school pages with filtering and search" })
  @ResponseMessage("Pages retrieved successfully")
  async getPages(
    @Param("id") id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.pagesService.getPages(id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Create a new page" })
  @ResponseMessage("Page created successfully")
  async createPage(
    @Param("id") id: string,
    @Body() dto: CreatePageDto,
  ) {
    return this.pagesService.createPage(id, dto);
  }

  @Get(":pageId")
  @ApiOperation({ summary: "Get single page with all builder sections" })
  @ResponseMessage("Page details retrieved")
  async getPageById(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
  ) {
    return this.pagesService.getPageById(id, pageId);
  }

  @Patch(":pageId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update page metadata, title or publishing status" })
  @ResponseMessage("Page updated successfully")
  async updatePage(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.updatePage(id, pageId, dto);
  }

  @Delete(":pageId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete page" })
  @ResponseMessage("Page deleted successfully")
  async deletePage(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
  ) {
    return this.pagesService.deletePage(id, pageId);
  }

  // --- Builder Sections Endpoints ---

  @Post(":pageId/sections")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Add section to page builder" })
  @ResponseMessage("Section added successfully")
  async createSection(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.pagesService.createSection(id, pageId, dto);
  }

  @Patch(":pageId/sections/reorder")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Reorder builder sections" })
  @ResponseMessage("Sections reordered successfully")
  async reorderSections(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.pagesService.reorderSections(id, pageId, dto);
  }

  @Patch(":pageId/sections/:sectionId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update builder section content or visibility" })
  @ResponseMessage("Section updated successfully")
  async updateSection(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
    @Param("sectionId", ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.pagesService.updateSection(id, pageId, sectionId, dto);
  }

  @Delete(":pageId/sections/:sectionId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Delete builder section" })
  @ResponseMessage("Section removed successfully")
  async deleteSection(
    @Param("id") id: string,
    @Param("pageId", ParseUUIDPipe) pageId: string,
    @Param("sectionId", ParseUUIDPipe) sectionId: string,
  ) {
    return this.pagesService.deleteSection(id, pageId, sectionId);
  }
}
