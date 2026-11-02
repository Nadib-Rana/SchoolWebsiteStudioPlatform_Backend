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
import { GalleryService } from "./gallery.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  AddPhotoDto,
  CreateMediaAssetDto,
} from "./dto/gallery.dto";

@ApiTags("Gallery & Media Library")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/gallery")
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({ summary: "Get gallery overview, storage meter and albums list" })
  @ResponseMessage("Gallery overview retrieved")
  async getGalleryOverview(@Param("id") id: string) {
    return this.galleryService.getGalleryOverview(id);
  }

  @Get("albums")
  @ApiOperation({ summary: "Get all photo albums" })
  @ResponseMessage("Albums retrieved successfully")
  async getAlbums(@Param("id") id: string) {
    return this.galleryService.getAlbums(id);
  }

  @Post("albums")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Create a new photo album" })
  @ResponseMessage("Album created successfully")
  async createAlbum(
    @Param("id") id: string,
    @Body() dto: CreateAlbumDto,
  ) {
    return this.galleryService.createAlbum(id, dto);
  }

  @Get("albums/:albumId")
  @ApiOperation({ summary: "Get album details with photos" })
  @ResponseMessage("Album details retrieved")
  async getAlbumById(
    @Param("id") id: string,
    @Param("albumId", ParseUUIDPipe) albumId: string,
  ) {
    return this.galleryService.getAlbumById(id, albumId);
  }

  @Patch("albums/:albumId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update album metadata" })
  @ResponseMessage("Album updated successfully")
  async updateAlbum(
    @Param("id") id: string,
    @Param("albumId", ParseUUIDPipe) albumId: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.galleryService.updateAlbum(id, albumId, dto);
  }

  @Delete("albums/:albumId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete album" })
  @ResponseMessage("Album deleted successfully")
  async deleteAlbum(
    @Param("id") id: string,
    @Param("albumId", ParseUUIDPipe) albumId: string,
  ) {
    return this.galleryService.deleteAlbum(id, albumId);
  }

  @Post("albums/:albumId/photos")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Add photo to album" })
  @ResponseMessage("Photo added to album")
  async addPhoto(
    @Param("id") id: string,
    @Param("albumId", ParseUUIDPipe) albumId: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.galleryService.addPhoto(id, albumId, dto);
  }

  @Delete("albums/:albumId/photos/:photoId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Delete photo from album" })
  @ResponseMessage("Photo deleted successfully")
  async deletePhoto(
    @Param("id") id: string,
    @Param("albumId", ParseUUIDPipe) albumId: string,
    @Param("photoId", ParseUUIDPipe) photoId: string,
  ) {
    return this.galleryService.deletePhoto(id, albumId, photoId);
  }

  // --- Media Library Endpoints ---

  @Get("media")
  @ApiOperation({ summary: "List media assets (images, documents, videos)" })
  @ResponseMessage("Media assets retrieved successfully")
  async getMediaAssets(
    @Param("id") id: string,
    @Query("category") category?: string,
  ) {
    return this.galleryService.getMediaAssets(id, category);
  }

  @Post("media")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Register new media asset entry" })
  @ResponseMessage("Media asset registered successfully")
  async createMediaAsset(
    @Param("id") id: string,
    @Body() dto: CreateMediaAssetDto,
  ) {
    return this.galleryService.createMediaAsset(id, dto);
  }

  @Delete("media/:assetId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete media asset" })
  @ResponseMessage("Media asset deleted successfully")
  async deleteMediaAsset(
    @Param("id") id: string,
    @Param("assetId", ParseUUIDPipe) assetId: string,
  ) {
    return this.galleryService.deleteMediaAsset(id, assetId);
  }
}
